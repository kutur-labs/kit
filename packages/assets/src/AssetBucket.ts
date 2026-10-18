import { type ByteSize, Context, type Effect, type Option, Schema, type Stream } from "effect";

export interface Info {
  readonly size: ByteSize.ByteSize;
  readonly contentType: string;
  /**
   * The `Cache-Control` the object is served with, such as by a CDN in front
   * of a public bucket. Absent when the object has none.
   */
  readonly cacheControl?: string | undefined;
}

export interface StoredObject {
  readonly info: Info;
  /** Implementations may stream from storage, so read it at most once. */
  readonly body: Stream.Stream<Uint8Array, AssetBucketError>;
}

export interface PutInput<E> {
  readonly key: string;
  readonly contentType: string;
  /** Stored with the object, to be served with it. */
  readonly cacheControl?: string | undefined;
  readonly body: Stream.Stream<Uint8Array, E>;
  /**
   * The body's exact length, when the caller knows it. Stores that need a
   * length to stream, such as R2, would otherwise buffer the body.
   */
  readonly contentLength?: ByteSize.ByteSize | undefined;
}

export class AssetBucketError extends Schema.TaggedError<
  AssetBucketError,
  { readonly brand: unique symbol }
>()("AssetBucketError", {
  operation: Schema.Literals(["put", "get", "head", "delete", "sign"]),
  bucket: Schema.String,
  key: Schema.String,
  cause: Schema.Defect(),
}) {}

/**
 * Object storage for one bucket. Implementations must keep keys apart,
 * including a key and the keys nested under it, replace an object on `put`,
 * keep its content type and cache control,
 * leave the previous object in place when a body fails and treat deleting a
 * missing object as success.
 */
export interface Bucket {
  readonly put: <E>(input: PutInput<E>) => Effect.Effect<Info, AssetBucketError | E>;
  readonly get: (key: string) => Effect.Effect<Option.Option<StoredObject>, AssetBucketError>;
  readonly head: (key: string) => Effect.Effect<Option.Option<Info>, AssetBucketError>;
  readonly delete: (key: string) => Effect.Effect<void, AssetBucketError>;
}

/** A logical bucket: assets name it, and a layer per environment backs it. */
export interface Tag<Self, Id extends string = string> extends Context.Service<Self, Bucket> {
  // The key in the instance type keeps bucket classes apart: without it,
  // classes from `Service` are structurally equal, and providing one bucket
  // would satisfy the requirement for every other.
  new (_: never): { readonly key: `@kutur-kit/assets/AssetBucket/${Id}` };
  readonly id: Id;
}

/** What asset definitions need of a bucket. Its `Tag` adds the service type. */
export interface Any {
  readonly id: string;
}

/**
 * Declares a logical bucket as a service:
 *
 * ```ts
 * export class Public extends AssetBucket.Service<Public>()("public") {}
 * ```
 *
 * The id names the bucket in errors and adapters; it is not a physical bucket name.
 */
export const Service =
  <Self>() =>
  <const Id extends string>(id: Id): Tag<Self, Id> =>
    Object.assign(Context.Service<Self, Bucket>()(`@kutur-kit/assets/AssetBucket/${id}`), { id });
