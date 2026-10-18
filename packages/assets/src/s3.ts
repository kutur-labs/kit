import type * as AssetSigning from "./AssetSigning.ts";
import type * as HttpClient from "effect/http/HttpClient";

import * as Credentials from "@distilled.cloud/aws/Credentials";
import * as Presign from "@distilled.cloud/aws/Presign";
import * as Region from "@distilled.cloud/aws/Region";
import * as S3 from "@distilled.cloud/aws/s3";
import { ByteSize, Clock, DateTime, Duration, Effect, Layer, Option, Stream } from "effect";

import * as AssetBucket from "./AssetBucket.ts";
import * as AssetSigningModule from "./AssetSigning.ts";
import { concat } from "./internal/bytes.ts";
import { encodeKey } from "./internal/url.ts";

export interface Options {
  /** The bucket's name in the storage. */
  readonly bucket: string;
}

export interface SigningOptions extends Options {
  /**
   * Where clients reach the storage, such as
   * `https://<account>.r2.cloudflarestorage.com` or `http://localhost:9000`.
   * Signed URLs are path-style under it: `${endpoint}/${bucket}/${key}`.
   */
  readonly endpoint: string;
}

type Requirements = Credentials.Credentials | HttpClient.HttpClient;

const failure =
  (bucket: string, operation: AssetBucket.AssetBucketError["operation"], key: string) =>
  (cause: unknown) =>
    new AssetBucket.AssetBucketError({ operation, bucket, key, cause });

/**
 * Backs a bucket with S3 or a store with its API, such as R2 or RustFS,
 * through `@distilled.cloud/aws`. Provide its `Credentials` and an
 * `HttpClient`, and an `Endpoint` for stores other than AWS.
 *
 * Bodies are collected before they are sent, so a failing body sends nothing.
 * Uploads through the app are small by `maxSize`; larger files go to storage
 * directly, through `signing`.
 */
export const layer = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: Options,
): Layer.Layer<Self, never, Requirements> =>
  Layer.effect(
    bucket,
    Effect.gen(function* () {
      // S3 reads the optional `Endpoint` and `Region` when called, so the
      // whole context is kept, not just the required services.
      const context = yield* Effect.context<Requirements>();
      const Bucket = options.bucket;

      const fail = (operation: AssetBucket.AssetBucketError["operation"], key: string) =>
        failure(bucket.id, operation, key);

      return bucket.of({
        put: ({ key, contentType, cacheControl, body }) =>
          Effect.gen(function* () {
            const bytes = concat(yield* Stream.runCollect(body));

            const request: S3.PutObjectRequest = {
              Bucket,
              Key: key,
              Body: bytes,
              ContentType: contentType,
            };

            if (cacheControl !== undefined) request.CacheControl = cacheControl;

            yield* S3.putObject(request).pipe(
              Effect.provideContext(context),
              Effect.mapError(fail("put", key)),
            );

            return { size: ByteSize.bytes(bytes.length), contentType, cacheControl };
          }),
        get: (key) =>
          S3.getObject({ Bucket, Key: key }).pipe(
            Effect.map((object) =>
              Option.some({
                info: {
                  size: ByteSize.bytes(object.ContentLength ?? 0),
                  contentType: object.ContentType ?? "application/octet-stream",
                  cacheControl: object.CacheControl,
                },
                body:
                  object.Body === undefined
                    ? Stream.empty
                    : Stream.mapError(object.Body, fail("get", key)),
              }),
            ),
            Effect.catchTag("NoSuchKey", () => Effect.succeedNone),
            Effect.provideContext(context),
            Effect.mapError(fail("get", key)),
          ),
        head: (key) =>
          S3.headObject({ Bucket, Key: key }).pipe(
            Effect.map((object) =>
              Option.some({
                size: ByteSize.bytes(object.ContentLength ?? 0),
                contentType: object.ContentType ?? "application/octet-stream",
                cacheControl: object.CacheControl,
              }),
            ),
            Effect.catchTag("NotFound", () => Effect.succeedNone),
            Effect.provideContext(context),
            Effect.mapError(fail("head", key)),
          ),
        delete: (key) =>
          S3.deleteObject({ Bucket, Key: key }).pipe(
            Effect.asVoid,
            Effect.provideContext(context),
            Effect.mapError(fail("delete", key)),
          ),
      });
    }),
  );

// The longest S3 allows for a presigned URL.
const maxExpiry = Duration.days(7);

/**
 * Signs URLs for a bucket with SigV4, for clients to upload to and download
 * from the storage directly. Uploads are signed with their content type and
 * length, the cache control to store, and to create an object only, which
 * the storage enforces.
 */
export const signing = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: SigningOptions,
): Layer.Layer<AssetSigning.SigningOf<Self>, never, Credentials.Credentials> =>
  Layer.effect(
    AssetSigningModule.of(bucket),
    Effect.gen(function* () {
      const context = yield* Effect.context<Credentials.Credentials>();
      const base = `${options.endpoint.replace(/\/+$/u, "")}/${options.bucket}`;

      const sign = (
        method: "PUT" | "GET",
        key: string,
        expiresIn: Duration.Duration,
        signed: Readonly<Record<string, string>>,
      ) =>
        Effect.gen(function* () {
          const credentials = yield* yield* Credentials.Credentials;
          const now = yield* Clock.currentTimeMillis;
          const seconds = Math.ceil(Duration.toMillis(Duration.min(expiresIn, maxExpiry)) / 1000);

          const url = yield* Presign.presignUrl({
            method,
            url: `${base}/${encodeKey(key)}`,
            service: "s3",
            region: credentials.region,
            expiresIn: seconds,
            headers: signed,
            // The signing time comes from Effect's clock, as the expiry does.
            datetime: new Date(now).toISOString().replace(/[-:]|\.\d{3}/gu, ""),
          }).pipe(Effect.provideService(Region.Region, Effect.succeed(credentials.region)));

          return {
            method,
            url,
            // Browsers set Content-Length from the body; the rest is sent as given.
            headers: Object.fromEntries(
              Object.entries(signed).filter(([name]) => name !== "content-length"),
            ),
            expiresAt: DateTime.makeUnsafe(now + seconds * 1000),
          };
        }).pipe(Effect.provideContext(context), Effect.mapError(failure(bucket.id, "sign", key)));

      return {
        // Content-Length is signed: without it, the storage accepts any size.
        // `If-None-Match: *` makes the URL write-once: replayed after its
        // upload, even with other bytes of the same length, it is refused.
        signPut: ({ key, contentType, contentLength, cacheControl, expiresIn }) =>
          sign("PUT", key, expiresIn, {
            "content-type": contentType,
            "content-length": String(contentLength),
            "if-none-match": "*",
            // Signed, or browsers' `no-cache` for conditional requests is stored.
            "cache-control": cacheControl,
          }),
        signGet: ({ key, expiresIn }) => sign("GET", key, expiresIn, {}),
      };
    }),
  );
