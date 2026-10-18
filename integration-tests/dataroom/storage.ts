import * as AssetDelivery from "@kutur-kit/assets/AssetDelivery";
import * as DeliveryLocal from "@kutur-kit/assets/delivery/local";
import * as S3Assets from "@kutur-kit/assets/s3";
import { Layer } from "effect";

import { Avatars, Documents } from "./assets.ts";

export interface StorageOptions {
  /** Where browsers reach the S3 storage, for signed URLs. */
  readonly endpoint: string;
  readonly documents: string;
  readonly avatars: string;
}

// In production a CDN in front of the avatars bucket serves this path; here
// the app serves it from the bucket itself.
const cdn = { baseUrl: "/cdn/avatars" };

/**
 * Both buckets on S3-compatible storage. Documents are private: browsers
 * reach them through signed URLs. Avatars are public, under the CDN path.
 * Needs the storage's credentials, an `HttpClient` and its `Endpoint`.
 */
export const Storage = (options: StorageOptions) =>
  Layer.mergeAll(
    S3Assets.layer(Documents, { bucket: options.documents }),
    S3Assets.signing(Documents, { bucket: options.documents, endpoint: options.endpoint }),
    S3Assets.layer(Avatars, { bucket: options.avatars }),
    AssetDelivery.layer(Avatars, cdn),
  );

/** The CDN path, served by the app. */
export const StorageRoutes = DeliveryLocal.routes(Avatars, cdn);
