import type * as AssetSigning from "../AssetSigning.ts";

import * as Credentials from "@distilled.cloud/aws/Credentials";
import * as Presign from "@distilled.cloud/aws/Presign";
import * as Region from "@distilled.cloud/aws/Region";
import { Clock, DateTime, Duration, Effect } from "effect";

import * as AssetBucket from "../AssetBucket.ts";
import { encodeKey } from "./url.ts";

/** Where signed URLs point: path-style, `${endpoint}/${bucket}/${key}`. */
export interface Target {
  readonly endpoint: string;
  readonly bucket: string;
}

// The longest S3 allows for a presigned URL.
const maxExpiry = Duration.days(7);

/**
 * Signs with SigV4 for the S3 API. The target and the `Credentials` are
 * resolved for each request, so stores that deliver them at runtime, such as
 * alchemy's R2 bindings, can sign too.
 */
export const make = <R>(
  bucketId: string,
  target: Effect.Effect<Target, never, R>,
): Effect.Effect<AssetSigning.Signing, never, Credentials.Credentials | R> =>
  Effect.map(Effect.context<Credentials.Credentials | R>(), (context) => {
    const sign = (
      method: "PUT" | "GET",
      key: string,
      expiresIn: Duration.Duration,
      signed: Readonly<Record<string, string>>,
    ) =>
      Effect.gen(function* () {
        const { endpoint, bucket } = yield* target;
        const credentials = yield* yield* Credentials.Credentials;
        const now = yield* Clock.currentTimeMillis;
        const seconds = Math.ceil(Duration.toMillis(Duration.min(expiresIn, maxExpiry)) / 1000);

        const url = yield* Presign.presignUrl({
          method,
          url: `${endpoint.replace(/\/+$/u, "")}/${bucket}/${encodeKey(key)}`,
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
      }).pipe(
        Effect.provideContext(context),
        Effect.mapError(
          (cause) =>
            new AssetBucket.AssetBucketError({ operation: "sign", bucket: bucketId, key, cause }),
        ),
      );

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
  });
