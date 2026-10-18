import type * as AssetSigning from "../AssetSigning.ts";
import type { Bucket, BucketCorsRule } from "alchemy/Cloudflare/R2/Bucket";
import type { PutOptions, R2Object } from "alchemy/Cloudflare/R2/BucketTypes";
import type { WorkerEnvironment } from "alchemy/Cloudflare/Workers/Worker";

import * as Credentials from "@distilled.cloud/aws/Credentials";
import { ReadWriteBucket } from "alchemy/Cloudflare/R2/ReadWriteBucket";
import { S3Credentials } from "alchemy/Cloudflare/R2/S3Credentials";
import { RuntimeContext } from "alchemy/RuntimeContext";
import { ByteSize, Effect, Layer, Option, Stream } from "effect";

import * as AssetBucket from "../AssetBucket.ts";
import * as AssetSigningModule from "../AssetSigning.ts";
import { concat } from "../internal/bytes.ts";
import * as SigV4 from "../internal/sigv4.ts";

/** An R2 bucket resource, or the Effect that declares it. */
export type R2Bucket<R = never> = Bucket | Effect.Effect<Bucket, never, R>;

// Alchemy marks binding methods as callable only while handling a request.
// `Bucket` methods carry no requirements, so the marker is satisfied here,
// as alchemy does where it implements other interfaces. The methods read
// nothing from it, but they fail if called while a Worker is constructed.
const handling = <A, E>(effect: Effect.Effect<A, E, RuntimeContext>): Effect.Effect<A, E> =>
  Effect.provide(effect, RuntimeContext.phantom);

/** The HTTP metadata R2 stores with an object and serves with it. */
type HttpMetadata = Exclude<NonNullable<PutOptions["httpMetadata"]>, Headers>;

const infoOf = (object: R2Object): AssetBucket.Info => ({
  size: ByteSize.bytes(object.size),
  contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
  cacheControl: object.httpMetadata?.cacheControl,
});

/**
 * Backs a bucket with an R2 bucket through alchemy's `ReadWriteBucket`.
 * Provide its implementation for where the app runs: `ReadWriteBucketBinding`
 * in a Worker, `ReadWriteBucketHttp` elsewhere alchemy deploys. Content type
 * and cache control are stored as the object's HTTP metadata, which R2
 * serves on its public domains.
 *
 * Bodies are collected before they are sent, so a failing body sends
 * nothing. Uploads through the app are small by `maxSize`; larger files go
 * to storage directly, through `signing`.
 */
export const layer = <Self, Id extends string, R = never>(
  bucket: AssetBucket.Tag<Self, Id>,
  r2: R2Bucket<R>,
): Layer.Layer<Self, never, ReadWriteBucket | R> =>
  Layer.effect(
    bucket,
    Effect.gen(function* () {
      const client = yield* ReadWriteBucket(r2);

      const fail = (operation: AssetBucket.AssetBucketError["operation"], key: string) =>
        Effect.mapError(
          (cause: unknown) =>
            new AssetBucket.AssetBucketError({ operation, bucket: bucket.id, key, cause }),
        );

      return bucket.of({
        put: ({ key, contentType, cacheControl, body }) =>
          Effect.gen(function* () {
            const bytes = concat(yield* Stream.runCollect(body));
            const httpMetadata: HttpMetadata = { contentType };

            if (cacheControl !== undefined) httpMetadata.cacheControl = cacheControl;

            const object = yield* handling(client.put(key, bytes, { httpMetadata })).pipe(
              fail("put", key),
            );

            return { ...infoOf(object), contentType, cacheControl };
          }),
        get: (key) =>
          handling(client.get(key)).pipe(
            Effect.map((object) =>
              object === null
                ? Option.none()
                : Option.some({
                    info: infoOf(object),
                    body: Stream.mapError(
                      object.body,
                      (cause) =>
                        new AssetBucket.AssetBucketError({
                          operation: "get",
                          bucket: bucket.id,
                          key,
                          cause,
                        }),
                    ),
                  }),
            ),
            fail("get", key),
          ),
        head: (key) =>
          handling(client.head(key)).pipe(
            Effect.map((object) => (object === null ? Option.none() : Option.some(infoOf(object)))),
            fail("head", key),
          ),
        delete: (key) => handling(client.delete(key)).pipe(fail("delete", key)),
      });
    }),
  );

/**
 * Signs URLs for an R2 bucket from a Worker, with the S3 credentials alchemy
 * derives for it: a token scoped to the bucket when deployed, the local S3
 * endpoint under `alchemy dev`. Signed as `S3Assets.signing` signs: uploads
 * are bound to their content type, length and cache control, and write once.
 *
 * Outside a Worker, use `S3Assets.signing` with `S3Assets.r2Endpoint` and
 * the S3 keys of an R2 API token.
 */
export const signing = <Self, Id extends string, R = never>(
  bucket: AssetBucket.Tag<Self, Id>,
  r2: R2Bucket<R>,
): Layer.Layer<AssetSigning.SigningOf<Self>, never, WorkerEnvironment | R> =>
  Layer.effect(
    AssetSigningModule.of(bucket),
    Effect.gen(function* () {
      const credentials = handling(yield* S3Credentials(r2, { access: "read-write" }));

      return yield* SigV4.make(
        bucket.id,
        Effect.map(credentials, ({ endpoint, bucketName }) => ({ endpoint, bucket: bucketName })),
      ).pipe(
        Effect.provideService(
          Credentials.Credentials,
          Effect.map(credentials, ({ accessKeyId, secretAccessKey, region }) =>
            Credentials.fromAwsCredentialIdentity({ accessKeyId, secretAccessKey }, region),
          ),
        ),
      );
    }),
  );

/**
 * The CORS rule an R2 bucket needs for browsers on `origins` to upload to it
 * with signed URLs: `PUT` with `AssetSigning.uploadHeaders`.
 *
 * ```ts
 * Cloudflare.R2.Bucket("Uploads", { cors: [AssetsR2.corsRule(["https://app.example.com"])] })
 * ```
 */
export const corsRule = (origins: ReadonlyArray<string>): BucketCorsRule => ({
  allowedMethods: ["PUT"],
  allowedOrigins: [...origins],
  allowedHeaders: [...AssetSigningModule.uploadHeaders],
});
