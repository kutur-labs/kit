import type * as Asset from "./Asset.ts";
import type * as AssetBucket from "./AssetBucket.ts";

import { ByteSize, Context, Duration, Effect, Option, Schema, SchemaGetter } from "effect";

/**
 * A request a client sends to storage itself, such as a browser uploading a
 * file without passing it through the app. A schema, so APIs can return it.
 */
export const SignedRequest = Schema.Struct({
  method: Schema.Literals(["PUT", "GET"]),
  url: Schema.String,
  /**
   * Headers the client must send as given: they are part of the signature.
   * Uploads use only `uploadHeaders`.
   */
  headers: Schema.Record(Schema.String, Schema.String),
  expiresAt: Schema.DateTimeUtc,
});

export type SignedRequest = typeof SignedRequest.Type;

/**
 * The headers a signed upload may carry. Browsers send a CORS preflight
 * before uploading with them to storage on another origin, so the bucket's
 * CORS rules must allow them, not only `content-type`:
 *
 * ```ts
 * { allowedOrigins: [appOrigin], allowedMethods: ["PUT"], allowedHeaders: [...AssetSigning.uploadHeaders] }
 * ```
 */
export const uploadHeaders = ["content-type", "if-none-match", "cache-control"] as const;

export interface SignPutInput {
  readonly key: string;
  readonly contentType: string;
  /** The exact length the upload must have. */
  readonly contentLength: ByteSize.ByteSize;
  /** Stored with the object; the client must send it as given. */
  readonly cacheControl: string;
  readonly expiresIn: Duration.Duration;
}

export interface SignGetInput {
  readonly key: string;
  readonly expiresIn: Duration.Duration;
}

/**
 * Signs requests that clients send to a bucket's storage directly. Storage
 * must refuse a signed request that differs from what was signed: another
 * method, key, content type, length or cache control, or one sent after it
 * expires. Signed uploads create an object and never replace one, so a URL
 * replayed after its upload is refused.
 */
export interface Signing {
  readonly signPut: (
    input: SignPutInput,
  ) => Effect.Effect<SignedRequest, AssetBucket.AssetBucketError>;
  readonly signGet: (
    input: SignGetInput,
  ) => Effect.Effect<SignedRequest, AssetBucket.AssetBucketError>;
}

/** The service a bucket's `Signing` is provided as. */
export interface SigningOf<Self> {
  readonly "~@kutur-kit/assets/AssetSigning": Self;
}

/** The key a bucket's `Signing` is provided and required by. */
export const of = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
): Context.Service<SigningOf<Self>, Signing> =>
  Context.Service<SigningOf<Self>, Signing>(`@kutur-kit/assets/AssetSigning/${bucket.id}`);

/**
 * The stored object does not match the upload it should hold: it is missing,
 * or its size or content type differs from what the client declared.
 */
export class UploadNotConfirmed extends Schema.TaggedError<
  UploadNotConfirmed,
  { readonly brand: unique symbol }
>()(
  "AssetUploadNotConfirmed",
  { asset: Schema.String, reason: Schema.Literals(["missing", "size", "contentType"]) },
  { httpApiStatus: 409 },
) {}

/** An upload a client declares before sending it: its content type and size. */
export interface Upload<Type extends Asset.MediaType> {
  readonly contentType: Type;
  readonly size: ByteSize.ByteSize;
}

// A size in a JSON body: a whole number of bytes.
const Size = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.decodeTo(Schema.ByteSize, {
    decode: SchemaGetter.transform((size: number) => ByteSize.bytes(size)),
    encode: SchemaGetter.transform((size: ByteSize.ByteSize) => Number(size)),
  }),
);

/** The schema of an upload declaration, a struct apps can extend with its `fields`. */
export type UploadSchema<Type extends Asset.MediaType> = Schema.Struct<{
  readonly contentType: Schema.Codec<Type, string>;
  readonly size: typeof Size;
}>;

/**
 * Decodes an upload a client declares, such as a request body, with a content
 * type the asset accepts. Sizes over its `maxSize` are refused by
 * `presignPut`, as `Asset.TooLarge`. Extend it for requests that carry more:
 *
 * ```ts
 * Schema.Struct({ ...AssetSigning.Upload(ProjectFile).fields, name: Schema.String })
 * ```
 */
export const Upload = <Type extends Asset.MediaType, K, B>(
  asset: Asset.Asset<string, Type, K, B>,
): UploadSchema<Type> => Schema.Struct({ contentType: asset.ContentType, size: Size });

export interface SignOptions {
  /** How long the URL stays valid. 15 minutes by default. */
  readonly expiresIn?: Duration.Input | undefined;
}

const expiry = (options: SignOptions | undefined) =>
  Duration.fromInputUnsafe(options?.expiresIn ?? "15 minutes");

/**
 * Signs a URL the client uploads the object to, bound to its content type,
 * size and the asset's cache control.
 */
export const presignPut = <Type extends Asset.MediaType, K, B>(
  asset: Asset.Asset<string, Type, K, B>,
  key: K,
  upload: Upload<Type>,
  options?: SignOptions,
): Effect.Effect<
  SignedRequest,
  Asset.InvalidKey | Asset.UnsupportedContentType | Asset.TooLarge | AssetBucket.AssetBucketError,
  SigningOf<B>
> =>
  Effect.gen(function* () {
    const stored = yield* asset.storedKey(key);

    yield* asset.check({ contentType: upload.contentType, contentLength: upload.size });

    const signing = yield* of(asset.bucket);

    return yield* signing.signPut({
      key: stored,
      contentType: upload.contentType,
      contentLength: upload.size,
      cacheControl: asset.cacheControl,
      expiresIn: expiry(options),
    });
  });

/** Signs a URL the client downloads the object from. */
export const presignGet = <Type extends Asset.MediaType, K, B>(
  asset: Asset.Asset<string, Type, K, B>,
  key: K,
  options?: SignOptions,
): Effect.Effect<SignedRequest, Asset.InvalidKey | AssetBucket.AssetBucketError, SigningOf<B>> =>
  Effect.gen(function* () {
    const stored = yield* asset.storedKey(key);
    const signing = yield* of(asset.bucket);

    return yield* signing.signGet({ key: stored, expiresIn: expiry(options) });
  });

/**
 * Checks that a client's upload arrived as declared, before the app records
 * it: the object exists with the declared size and content type.
 */
export const confirm = <Type extends Asset.MediaType, K, B>(
  asset: Asset.Asset<string, Type, K, B>,
  key: K,
  upload: Upload<Type>,
): Effect.Effect<
  Asset.Info<Type>,
  Asset.InvalidKey | UploadNotConfirmed | AssetBucket.AssetBucketError,
  B
> =>
  Effect.gen(function* () {
    const stored = yield* asset.storedKey(key);
    const bucket = yield* asset.bucket;
    const info = yield* bucket.head(stored);

    const reason = Option.match(info, {
      onNone: () => Option.some("missing" as const),
      onSome: ({ size, contentType }) =>
        size !== upload.size
          ? Option.some("size" as const)
          : contentType === upload.contentType
            ? Option.none()
            : Option.some("contentType" as const),
    });

    return yield* Option.match(reason, {
      onNone: () => Effect.succeed({ size: upload.size, contentType: upload.contentType }),
      onSome: (because) =>
        Effect.fail(new UploadNotConfirmed({ asset: asset.id, reason: because })),
    });
  });
