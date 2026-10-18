import type { RuntimeContext } from "alchemy/RuntimeContext";

import * as Cloudflare from "alchemy/Cloudflare";
import { ByteSize, Cause, Duration, Effect, Exit, Layer, Schema, Stream } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpServerRequest } from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import * as AssetsR2 from "../../src/alchemy/r2.ts";
import * as Asset from "../../src/Asset.ts";
import * as AssetSigning from "../../src/AssetSigning.ts";
import { AssetBucketContract, AssetSigningContract } from "../../src/testing/index.ts";
import { Assets } from "./bucket.ts";

const { ContractBucket } = AssetBucketContract;

const Avatar = Asset.make("avatar", {
  bucket: ContractBucket,
  contentTypes: ["image/png"],
  maxSize: "1 KiB",
  cacheControl: "public, max-age=31536000, immutable",
});

const contractCase = <R>(
  cases: ReadonlyArray<{ readonly run: Effect.Effect<void, never, R> }>,
  index: string | undefined,
) => cases[Number(index)]?.run ?? Effect.die(new Error(`No case ${index}`));

/**
 * Runs the asset contracts where an app on alchemy runs them: in a Worker,
 * on the bucket's binding, signing with the S3 credentials alchemy binds.
 * Each route answers 204, or 500 with the failure:
 *
 * - `/bucket/:index` and `/signing/:index` run a contract case.
 * - `/avatar` stores `avatar/ada` and answers with the HTTP metadata R2
 *   stored with it.
 * - `/upload` signs an upload of a one-byte PNG and answers with it, as
 *   `AssetSigning.SignedRequest` in JSON.
 */
export default class AssetsFixture extends Cloudflare.Worker<AssetsFixture>()(
  "AssetsFixture",
  { main: import.meta.url },
  Effect.gen(function* () {
    const raw = yield* Cloudflare.R2.ReadWriteBucket(Assets);

    const services = yield* Effect.context<
      | AssetBucketContract.ContractBucket
      | AssetSigning.SigningOf<AssetBucketContract.ContractBucket>
    >();

    const route = (
      path: ReadonlyArray<string>,
    ): Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      never,
      | AssetBucketContract.ContractBucket
      | AssetSigning.SigningOf<AssetBucketContract.ContractBucket>
      | RuntimeContext
    > => {
      const [kind = "", index] = path;

      switch (kind) {
        case "bucket":
          return Effect.as(
            contractCase(AssetBucketContract.cases, index),
            HttpServerResponse.empty({ status: 204 }),
          );
        case "signing":
          return Effect.as(
            Effect.provide(contractCase(AssetSigningContract.cases, index), FetchHttpClient.layer),
            HttpServerResponse.empty({ status: 204 }),
          );
        case "avatar":
          return Effect.gen(function* () {
            yield* Avatar.put(Asset.Key.make("ada"), Stream.make(new Uint8Array([1])), {
              contentType: "image/png",
            });

            const stored = yield* raw.head("avatar/ada");

            return yield* HttpServerResponse.json(stored?.httpMetadata ?? null);
          }).pipe(Effect.orDie);
        case "upload":
          return Effect.flatMap(AssetSigning.of(ContractBucket), (signer) =>
            signer.signPut({
              key: "a.png",
              contentType: "image/png",
              contentLength: ByteSize.bytes(1),
              cacheControl: "no-cache",
              expiresIn: Duration.minutes(5),
            }),
          ).pipe(
            Effect.flatMap(Schema.encodeEffect(Schema.toCodecJson(AssetSigning.SignedRequest))),
            Effect.flatMap(HttpServerResponse.json),
            Effect.orDie,
          );
        default:
          return Effect.succeed(HttpServerResponse.empty({ status: 404 }));
      }
    };

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        const path = new URL(request.url, "http://fixture").pathname.split("/").slice(1);
        const exit = yield* Effect.exit(Effect.provide(route(path), services));

        return Exit.isSuccess(exit)
          ? exit.value
          : HttpServerResponse.text(Cause.pretty(exit.cause), { status: 500 });
      }),
    };
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        AssetsR2.layer(ContractBucket, Assets),
        AssetsR2.signing(ContractBucket, Assets),
      ).pipe(Layer.provideMerge(Cloudflare.R2.ReadWriteBucketBinding)),
    ),
  ),
) {}
