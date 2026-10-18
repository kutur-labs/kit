import { ByteSize, Duration, Effect, Option } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";

import * as AssetSigning from "../AssetSigning.ts";
import { ContractBucket } from "./AssetBucketContract.ts";

/**
 * Checks a `Signing` implementation and the storage it signs for, over HTTP:
 * signed requests succeed, and requests that differ from what was signed are
 * refused without changing what is stored, and a signed upload writes once. Provide the `ContractBucket`, its
 * `Signing` and an `HttpClient` that can reach the signed URLs. Expiry is not
 * checked: it depends on the storage's clock. Cases delete the keys they
 * use under `contract/` first, so storage may keep objects between cases.
 */
export interface Case {
  readonly name: string;
  readonly run: Effect.Effect<
    void,
    never,
    ContractBucket | AssetSigning.SigningOf<ContractBucket> | HttpClient.HttpClient
  >;
}

const signing = AssetSigning.of(ContractBucket);

const key = "contract/signed.png";

const expiresIn = Duration.minutes(5);

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

// Not `no-cache`, which clients add to conditional requests themselves.
const cacheControl = "public, max-age=60";

const violated = (message: string) =>
  Effect.die(new Error(`AssetSigning contract violated: ${message}`));

const ensure = (holds: boolean, message: string) => (holds ? Effect.void : violated(message));

const ok = (status: number) => status >= 200 && status < 300;

const signPut = (contentType = "image/png", contentLength = png.length) =>
  Effect.flatMap(signing, (signer) =>
    signer.signPut({
      key,
      contentType,
      contentLength: ByteSize.bytes(contentLength),
      cacheControl,
      expiresIn,
    }),
  );

/** Sends a signed request as a client would, with its headers and a body. */
const send = (
  signed: AssetSigning.SignedRequest,
  options: {
    readonly body?: Uint8Array;
    readonly headers?: Record<string, string>;
    readonly url?: string;
  } = {},
) =>
  HttpClient.execute(
    HttpClientRequest.make(signed.method)(options.url ?? signed.url).pipe(
      HttpClientRequest.setHeaders({ ...signed.headers, ...options.headers }),
      (request) =>
        options.body === undefined
          ? request
          : HttpClientRequest.bodyUint8Array(
              request,
              options.body,
              options.headers?.["content-type"] ?? signed.headers["content-type"],
            ),
    ),
  );

// The value of the URL's signature parameter, such as S3's `X-Amz-Signature`.
const signatureOf = (url: string) =>
  [...new URL(url, "http://localhost").searchParams].find(([name]) =>
    /signature$/iu.test(name),
  )?.[1] ?? "";

// Cases start without the objects they check for.
const clear = Effect.flatMap(ContractBucket, (bucket) =>
  Effect.andThen(bucket.delete(key), bucket.delete("contract/other.png")),
);

const stored = Effect.flatMap(ContractBucket, (bucket) => bucket.head(key));

const expectRefused = (label: string, response: { readonly status: number }) =>
  ok(response.status)
    ? violated(`${label} was accepted with ${response.status}`)
    : Effect.flatMap(stored, (info) =>
        Option.isSome(info) ? violated(`${label} stored an object`) : Effect.void,
      );

export const cases: ReadonlyArray<Case> = [
  {
    name: "stores a signed upload and serves it to a signed download",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut();
      const uploaded = yield* send(put, { body: png });

      yield* ensure(ok(uploaded.status), `a signed upload failed with ${uploaded.status}`);

      const info = yield* stored;

      yield* ensure(
        Option.isSome(info) &&
          info.value.contentType === "image/png" &&
          info.value.cacheControl === cacheControl,
        "a signed upload was not stored with its content type and cache control",
      );

      const get = yield* Effect.flatMap(signing, (signer) => signer.signGet({ key, expiresIn }));
      const downloaded = yield* send(get);
      const body = new Uint8Array(yield* downloaded.arrayBuffer);

      yield* ensure(
        downloaded.status === 200 && body.join() === png.join(),
        "a signed download did not return the upload",
      );
    }).pipe(Effect.orDie),
  },
  {
    name: "signs uploads with no headers but `uploadHeaders`, which CORS rules allow",
    run: Effect.gen(function* () {
      const put = yield* signPut();
      const allowed: ReadonlySet<string> = new Set(AssetSigning.uploadHeaders);
      const others = Object.keys(put.headers).filter((name) => !allowed.has(name));

      yield* ensure(
        others.length === 0,
        `a signed upload needs other headers: ${others.join(", ")}`,
      );
    }).pipe(Effect.orDie),
  },
  {
    name: "refuses an upload of another content type than signed",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut("image/png");

      yield* expectRefused(
        "an upload as text/html",
        yield* send(put, { body: png, headers: { "content-type": "text/html" } }),
      );
    }).pipe(Effect.orDie),
  },
  {
    name: "refuses an upload with another cache control than signed",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut();

      yield* expectRefused(
        "an upload cached for a year",
        yield* send(put, {
          body: png,
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        }),
      );
    }).pipe(Effect.orDie),
  },
  {
    name: "refuses an upload of another length than signed",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut("image/png", png.length);

      yield* expectRefused(
        "a longer upload",
        yield* send(put, { body: new Uint8Array([...png, 0]) }),
      );
      yield* expectRefused("a shorter upload", yield* send(put, { body: png.slice(1) }));
    }).pipe(Effect.orDie),
  },
  {
    name: "refuses a signed URL used for another key or with its signature changed",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut();
      const signature = signatureOf(put.url);

      yield* ensure(signature !== "", "a signed URL has no signature parameter");

      const flipped = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;

      yield* expectRefused(
        "an upload to another key",
        yield* send(put, { body: png, url: put.url.replace("signed.png", "other.png") }),
      );
      yield* expectRefused(
        "an upload with a changed signature",
        yield* send(put, { body: png, url: put.url.replace(signature, flipped) }),
      );

      const other = yield* Effect.flatMap(ContractBucket, (bucket) =>
        bucket.head("contract/other.png"),
      );

      yield* ensure(Option.isNone(other), "an upload to another key was stored");
    }).pipe(Effect.orDie),
  },
  {
    name: "writes a signed upload once, however its URL is replayed",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut();

      yield* send(put, { body: png });

      // Same length and type, so only the write-once condition stops it.
      const other = png.map((byte) => 255 - byte);

      const { "if-none-match": _, ...unconditional } = put.headers;

      const replays = [
        yield* send(put, { body: other }),
        yield* send({ ...put, headers: unconditional }, { body: other }),
      ];

      yield* ensure(
        replays.every((response) => !ok(response.status)),
        `a replayed upload was accepted with ${replays.map((response) => response.status).join(", ")}`,
      );

      const get = yield* Effect.flatMap(signing, (signer) => signer.signGet({ key, expiresIn }));
      const body = new Uint8Array(yield* (yield* send(get)).arrayBuffer);

      yield* ensure(body.join() === png.join(), "a replayed upload replaced the object");
    }).pipe(Effect.orDie),
  },
  {
    name: "refuses a signed upload URL used to download",
    run: Effect.gen(function* () {
      yield* clear;

      const put = yield* signPut();

      yield* send(put, { body: png });

      const downloaded = yield* send({ ...put, method: "GET" });

      yield* ensure(!ok(downloaded.status), "an upload URL served a download");
    }).pipe(Effect.orDie),
  },
];
