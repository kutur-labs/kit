import * as Credentials from "@distilled.cloud/aws/Credentials";
import * as S3 from "@distilled.cloud/aws/s3";
import { it } from "@effect/vitest";
import * as RustfsContainer from "@kutur-kit/testcontainers/RustfsContainer";
import { rustfs } from "@kutur-kit/testcontainers/vitest";
import { ByteSize, Duration, Effect, Layer, Redacted, Stream } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { expect } from "vitest";

import * as AssetSigning from "../src/AssetSigning.ts";
import * as S3Assets from "../src/s3.ts";
import { AssetBucketContract, AssetSigningContract } from "../src/testing/index.ts";

const { ContractBucket } = AssetBucketContract;

/**
 * The bucket and its signing over a fresh bucket on the RustFS server, with
 * a fetch client for the signed URLs. Signing uses the live clock: RustFS
 * checks signatures against its own.
 */
const s3 = Layer.unwrap(
  Effect.gen(function* () {
    const server = yield* RustfsContainer.RustfsContainer;
    const name = yield* RustfsContainer.bucket;

    return Layer.mergeAll(
      S3Assets.layer(ContractBucket, { bucket: name }),
      S3Assets.signing(ContractBucket, { bucket: name, endpoint: server.endpoint }),
    );
  }),
).pipe(
  Layer.provideMerge(RustfsContainer.aws),
  Layer.provideMerge(rustfs),
  Layer.provideMerge(FetchHttpClient.layer),
);

for (const { name, run } of AssetBucketContract.cases)
  it.live(`S3 bucket ${name}`, () => run.pipe(Effect.provide(s3)));

for (const { name, run } of AssetSigningContract.cases)
  it.live(`S3 signing ${name}`, () => run.pipe(Effect.provide(s3)));

it.live(
  "signs URLs the storage refuses once they expire",
  () =>
    Effect.gen(function* () {
      const signing = yield* AssetSigning.of(ContractBucket);

      const signed = yield* signing.signPut({
        key: "expiring.png",
        contentType: "image/png",
        contentLength: ByteSize.bytes(1),
        cacheControl: "no-cache",
        expiresIn: Duration.seconds(1),
      });

      yield* Effect.sleep(Duration.seconds(2));

      const response = yield* HttpClient.execute(
        HttpClientRequest.put(signed.url).pipe(
          HttpClientRequest.bodyUint8Array(new Uint8Array([1]), "image/png"),
        ),
      );

      expect(response.status).toBe(403);
    }).pipe(Effect.provide(s3)),
  10_000,
);

// Browsers send a preflight before an upload with headers that are not
// CORS-safelisted. A rule allowing only `content-type`, the usual example,
// refuses the preflight, so the browser never sends the upload.
it.live("needs a CORS rule allowing `uploadHeaders` for browsers on another origin", () =>
  Effect.gen(function* () {
    const server = yield* RustfsContainer.RustfsContainer;
    const name = yield* RustfsContainer.bucket;
    const app = "https://app.example.com";

    const signing = yield* AssetSigning.of(ContractBucket).pipe(
      Effect.provide(S3Assets.signing(ContractBucket, { bucket: name, endpoint: server.endpoint })),
    );

    const signed = yield* signing.signPut({
      key: "a.png",
      contentType: "image/png",
      contentLength: ByteSize.bytes(1),
      cacheControl: "no-cache",
      expiresIn: Duration.minutes(1),
    });

    const allow = (headers: ReadonlyArray<string>) =>
      S3.putBucketCors({
        Bucket: name,
        CORSConfiguration: {
          CORSRules: [
            { AllowedOrigins: [app], AllowedMethods: ["PUT"], AllowedHeaders: [...headers] },
          ],
        },
      });

    const preflight = HttpClient.execute(
      HttpClientRequest.make("OPTIONS")(signed.url).pipe(
        HttpClientRequest.setHeaders({
          origin: app,
          "access-control-request-method": "PUT",
          "access-control-request-headers": Object.keys(signed.headers).join(","),
        }),
      ),
    );

    yield* allow(["content-type"]);

    expect((yield* preflight).status).toBe(403);

    yield* allow(AssetSigning.uploadHeaders);

    expect((yield* preflight).status).toBe(200);
  }).pipe(
    Effect.scoped,
    Effect.provide(
      Layer.mergeAll(RustfsContainer.aws, FetchHttpClient.layer).pipe(Layer.provideMerge(rustfs)),
    ),
  ),
);

// Credentials the server refuses fail every operation, unlike a missing
// bucket: a HEAD response has no body, so S3 reports one as a missing object.
const refused = Layer.unwrap(
  Effect.gen(function* () {
    const server = yield* RustfsContainer.RustfsContainer;
    const name = yield* RustfsContainer.bucket;

    return S3Assets.layer(ContractBucket, { bucket: name }).pipe(
      Layer.provide(
        Credentials.fromCredentials(
          { accessKeyId: server.accessKeyId, secretAccessKey: Redacted.make("wrong") },
          server.region,
        ),
      ),
    );
  }),
).pipe(Layer.provideMerge(RustfsContainer.aws), Layer.provideMerge(rustfs));

it.live("reports storage failures with the operation, bucket and key", () =>
  Effect.gen(function* () {
    const bucket = yield* ContractBucket;

    const errors = yield* Effect.all([
      Effect.flip(bucket.put({ key: "a", contentType: "text/plain", body: Stream.empty })),
      Effect.flip(bucket.get("a")),
      Effect.flip(bucket.head("a")),
      Effect.flip(bucket.delete("a")),
    ]);

    expect(errors.map((error) => [error._tag, error.operation, error.bucket, error.key])).toEqual(
      ["put", "get", "head", "delete"].map((operation) => [
        "AssetBucketError",
        operation,
        "assets-contract",
        "a",
      ]),
    );
  }).pipe(Effect.provide(refused)),
);

// Signing makes no request, so it runs on the test clock without a server.
const signer = S3Assets.signing(ContractBucket, {
  bucket: "avatars",
  endpoint: "https://storage.example.com/",
}).pipe(
  Layer.provide(
    Credentials.fromCredentials(
      { accessKeyId: Redacted.make("key"), secretAccessKey: Redacted.make("secret") },
      "eu-central-1",
    ),
  ),
);

it.effect("signs path-style URLs with the clock's time and the upload's headers", () =>
  Effect.gen(function* () {
    const signing = yield* AssetSigning.of(ContractBucket);

    const signed = yield* signing.signPut({
      key: "avatar/ada",
      contentType: "image/png",
      contentLength: ByteSize.bytes(4),
      cacheControl: "public, max-age=60",
      expiresIn: Duration.minutes(15),
    });

    const url = new URL(signed.url);

    expect(`${url.origin}${url.pathname}`).toBe("https://storage.example.com/avatars/avatar/ada");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      "X-Amz-Date": "19700101T000000Z",
      "X-Amz-Expires": "900",
      "X-Amz-SignedHeaders": "cache-control;content-length;content-type;host;if-none-match",
      "X-Amz-Credential": "key/19700101/eu-central-1/s3/aws4_request",
    });
    expect(signed).toMatchObject({ method: "PUT" });
    expect(signed.headers).toEqual({
      "content-type": "image/png",
      "if-none-match": "*",
      "cache-control": "public, max-age=60",
    });
    expect(signed.expiresAt.epochMilliseconds).toBe(900_000);
  }).pipe(Effect.provide(signer)),
);

it.effect("signs downloads for at most the 7 days S3 allows", () =>
  Effect.gen(function* () {
    const signing = yield* AssetSigning.of(ContractBucket);
    const signed = yield* signing.signGet({ key: "a", expiresIn: Duration.days(30) });

    expect(new URL(signed.url).searchParams.get("X-Amz-Expires")).toBe("604800");
    expect(new URL(signed.url).searchParams.get("X-Amz-SignedHeaders")).toBe("host");
    expect(signed).toMatchObject({ method: "GET", headers: {} });
    expect(signed.expiresAt.epochMilliseconds).toBe(604_800_000);
  }).pipe(Effect.provide(signer)),
);
