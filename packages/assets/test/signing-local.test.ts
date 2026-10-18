// By module: the package index also loads modules needing optional peers, such as redis.
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { it } from "@effect/vitest";
import { ByteSize, Duration, Effect, Exit, Layer, Option, Redacted, Stream } from "effect";
import {
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { TestClock } from "effect/testing";
import { expect } from "vitest";

import * as AssetSigning from "../src/AssetSigning.ts";
import * as Memory from "../src/memory.ts";
import * as SigningLocal from "../src/signing/local.ts";
import { AssetBucketContract, AssetSigningContract } from "../src/testing/index.ts";

const { ContractBucket } = AssetBucketContract;

const options = { baseUrl: "/storage/contract", secret: Redacted.make("development secret") };

/**
 * Routes on a Node server on a free port, with the bucket and signing they
 * share, and a fetch client the relative signed URLs resolve on.
 */
const server = <E, R>(routes: Layer.Layer<never, E, R>, signer = options) =>
  HttpRouter.serve(routes, { disableLogger: true }).pipe(
    Layer.provideMerge(SigningLocal.layer(ContractBucket, signer)),
    Layer.provideMerge(Memory.layer(ContractBucket)),
    Layer.provideMerge(NodeHttpServer.layerTest),
  );

const local = server(SigningLocal.routes(ContractBucket, options));

for (const { name, run } of AssetSigningContract.cases)
  it.effect(`local signing ${name}`, () => run.pipe(Effect.provide(local)));

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const signedPut = Effect.flatMap(AssetSigning.of(ContractBucket), (signer) =>
  signer.signPut({
    key: "a.png",
    contentType: "image/png",
    contentLength: ByteSize.bytes(png.length),
    cacheControl: "no-cache",
    expiresIn: Duration.minutes(1),
  }),
);

const send = (signed: AssetSigning.SignedRequest) =>
  HttpClient.execute(
    HttpClientRequest.put(signed.url).pipe(
      HttpClientRequest.setHeaders(signed.headers),
      HttpClientRequest.bodyUint8Array(png, "image/png"),
    ),
  );

const stored = Effect.flatMap(ContractBucket, (bucket) => bucket.head("a.png"));

it.effect("signs URLs that expire when they say", () =>
  Effect.gen(function* () {
    const signed = yield* signedPut;

    expect(signed.expiresAt.epochMilliseconds).toBe(60_000);

    yield* TestClock.adjust(Duration.seconds(60));

    expect((yield* send(signed)).status).toBe(200);

    yield* TestClock.adjust(Duration.seconds(1));

    yield* Effect.flatMap(ContractBucket, (bucket) => bucket.delete("a.png"));

    expect((yield* send(signed)).status).toBe(403);
    expect(Option.isNone(yield* stored)).toBe(true);
  }).pipe(Effect.provide(local)),
);

it.effect("refuses URLs signed with another secret", () =>
  Effect.gen(function* () {
    const signed = yield* signedPut;

    expect((yield* send(signed)).status).toBe(403);
    expect(Option.isNone(yield* stored)).toBe(true);
  }).pipe(
    Effect.provide(
      server(SigningLocal.routes(ContractBucket, options), {
        ...options,
        secret: Redacted.make("another secret"),
      }),
    ),
  ),
);

it.effect("refuses uploads without a signature or a length", () =>
  Effect.gen(function* () {
    const unsigned = yield* HttpClient.execute(
      HttpClientRequest.put(`${options.baseUrl}/a.png`).pipe(
        HttpClientRequest.bodyUint8Array(png, "image/png"),
      ),
    );

    // A streamed body is sent chunked, without Content-Length.
    const signed = yield* signedPut;

    const chunked = yield* HttpClient.execute(
      HttpClientRequest.put(signed.url).pipe(
        HttpClientRequest.bodyStream(Stream.make(png), { contentType: "image/png" }),
      ),
    );

    expect([unsigned.status, chunked.status]).toEqual([403, 403]);
    expect(Option.isNone(yield* stored)).toBe(true);
  }).pipe(Effect.provide(local)),
);

// Routes that store any upload, as a signer that forgets to verify would.
const trusting = HttpRouter.add(
  "PUT",
  "/storage/contract/*",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const bucket = yield* ContractBucket;
    const key = new URL(request.url, "http://localhost").pathname.split("/").slice(3).join("/");

    yield* bucket.put({
      key,
      contentType: request.headers["content-type"] ?? "",
      body: Stream.orDie(request.stream),
    });

    return HttpServerResponse.empty({ status: 200 });
  }).pipe(Effect.orDie),
);

it.effect("the contract fails storage that does not verify signatures", () =>
  Effect.gen(function* () {
    const exits = yield* Effect.forEach(AssetSigningContract.cases, ({ run }) =>
      Effect.exit(run.pipe(Effect.provide(server(trusting)))),
    );

    expect(exits.filter(Exit.isFailure).length).toBeGreaterThanOrEqual(3);
  }),
);
