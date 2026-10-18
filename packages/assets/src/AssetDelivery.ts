import type * as Asset from "./Asset.ts";
import type * as AssetBucket from "./AssetBucket.ts";

import { Context, Effect, Layer } from "effect";

import { encodeKey } from "./internal/url.ts";

/** Public URLs for a bucket's objects, such as on a CDN. Only public buckets have them. */
export interface Delivery {
  readonly url: (key: string) => string;
}

/** The service a bucket's `Delivery` is provided as. */
export interface DeliveryOf<Self> {
  readonly "~@kutur-kit/assets/AssetDelivery": Self;
}

/** The key a bucket's `Delivery` is provided and required by. */
export const of = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
): Context.Service<DeliveryOf<Self>, Delivery> =>
  Context.Service<DeliveryOf<Self>, Delivery>(`@kutur-kit/assets/AssetDelivery/${bucket.id}`);

/**
 * Public URLs for a bucket's objects under a base URL, such as a CDN or custom
 * domain in front of the storage: `${baseUrl}/${key}`.
 */
export const layer = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: { readonly baseUrl: string },
): Layer.Layer<DeliveryOf<Self>> =>
  Layer.succeed(of(bucket), { url: (key) => `${options.baseUrl}/${encodeKey(key)}` });

/** The object's public URL. */
export const url = <Type extends Asset.MediaType, K, B>(
  asset: Asset.Asset<string, Type, K, B>,
  key: K,
): Effect.Effect<string, Asset.InvalidKey, DeliveryOf<B>> =>
  Effect.flatMap(asset.storedKey(key), (stored) =>
    of(asset.bucket).useSync((delivery) => delivery.url(stored)),
  );
