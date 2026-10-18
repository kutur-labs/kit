import type * as Asset from "./Asset.ts";
import type * as AssetBucket from "./AssetBucket.ts";

import { ByteSize, Effect, Layer, Option, Stream } from "effect";

import { concat } from "./internal/bytes.ts";

interface Entry {
  readonly info: AssetBucket.Info;
  readonly bytes: Uint8Array;
}

/**
 * Backs a bucket with memory for the lifetime of the layer. Bodies are copied
 * in and out, so callers cannot change stored bytes.
 */
export const layer = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
): Layer.Layer<Self> =>
  Layer.sync(bucket, () => {
    const objects = new Map<string, Entry>();

    return bucket.of({
      put: ({ key, contentType, cacheControl, body }) =>
        Stream.runCollect(body).pipe(
          Effect.map((chunks) => {
            const bytes = concat(chunks);
            const info = { size: ByteSize.bytes(bytes.length), contentType, cacheControl };

            objects.set(key, { info, bytes });

            return info;
          }),
        ),
      get: (key) =>
        Effect.sync(() =>
          Option.map(Option.fromUndefinedOr(objects.get(key)), ({ info, bytes }) => ({
            info,
            body: Stream.succeed(bytes.slice()),
          })),
        ),
      head: (key) =>
        Effect.sync(() => Option.map(Option.fromUndefinedOr(objects.get(key)), ({ info }) => info)),
      delete: (key) =>
        Effect.sync(() => {
          objects.delete(key);
        }),
    });
  });

/** Backs the buckets of the given assets with memory, one store per bucket. */
export const toLayer = <const Assets extends ReadonlyArray<Asset.Any>>(
  assets: Assets,
): Layer.Layer<Asset.BucketOf<Assets[number]>> => {
  // SAFETY: asset buckets are tags from AssetBucket.Service.
  const buckets = new Set(assets.map((asset) => asset.bucket as AssetBucket.Tag<unknown>));

  const merged = [...buckets].reduce<Layer.Layer<never>>(
    (layers, bucket) => Layer.merge(layers, layer(bucket)),
    Layer.empty,
  );

  // SAFETY: the merged layers provide exactly the buckets of the listed assets.
  return merged as Layer.Layer<Asset.BucketOf<Assets[number]>>;
};
