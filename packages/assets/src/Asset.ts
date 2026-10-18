import type * as AssetBucket from "./AssetBucket.ts";

import { ByteSize, Effect, Option, Schema, SchemaGetter, Stream } from "effect";

/**
 * A media type without parameters, such as `image/png`. Only the top-level
 * type is checked, which catches typos without a registry of every subtype.
 */
export type MediaType = `${
  | "application"
  | "audio"
  | "font"
  | "image"
  | "model"
  | "text"
  | "video"}/${string}`;

// S3 and R2 limit keys to 1024 bytes, prefixes included. Keys are ASCII, so
// bytes are characters.
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
// https://developers.cloudflare.com/r2/platform/limits/
const maxKeyLength = 1024;

// S3's safe characters, without `*`, which Windows file names forbid. Keys made
// of these need no encoding in URLs or file system paths. S3 also advises
// against `.` and `..` segments, which tools resolve as relative paths.
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines
// https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
const segmentPattern = /^[0-9A-Za-z!\-_.'()]+$/;

// Stores that keep objects as files, such as RustFS, refuse longer segments,
// as file systems limit names to 255 bytes.
const maxSegmentLength = 255;

const isSegment = (segment: string) =>
  segmentPattern.test(segment) &&
  segment.length <= maxSegmentLength &&
  segment !== "." &&
  segment !== "..";

const portable = (prefix: string) =>
  Schema.makeFilter<string>((key) => {
    if (!key.split("/").every(isSegment))
      return "segments must be non-empty, not `.` or `..`, at most 255 characters, and use only letters, digits and ! - _ . ' ( )";

    if (prefix.length + key.length > maxKeyLength)
      return `${prefix === "" ? "keys" : `keys with the prefix ${prefix}`} must fit in ${maxKeyLength} characters`;

    return undefined;
  });

/**
 * A key that fits every store and URL without encoding: segments separated by
 * `/`, each made of letters, digits and `! - _ . ' ( )`, not `.` or `..`, at
 * most 255 characters each and 1024 in all. The asset id prefix also counts towards the limit,
 * which each asset's `Key` checks.
 */
export const Key = Schema.String.check(portable("")).pipe(Schema.brand("@kutur-kit/assets/Key"));

export type Key = typeof Key.Type;

/** Encodes an asset's keys to strings. Its encoded keys are checked like `Key`. */
export type KeySchema<K> = Schema.Codec<K, string>;

export interface Definition<Type extends MediaType = MediaType, K = Key> {
  /** A bucket from `AssetBucket.Service`. */
  readonly bucket: AssetBucket.Any;
  /**
   * The keys callers pass, such as a `UserId` or a `Schema.TemplateLiteral`
   * of ids. `Key` by default.
   */
  readonly key?: KeySchema<K>;
  /**
   * Accepted media types, in lowercase and without parameters. There is no
   * default: a bucket served from your domain must not accept arbitrary types
   * such as `text/html`.
   */
  readonly contentTypes: readonly [Type, ...ReadonlyArray<Type>];
  /**
   * Such as `"5 MiB"` or a number of bytes. Checked while the body streams,
   * before the store commits it.
   */
  readonly maxSize: ByteSize.Input;
  /**
   * The `Cache-Control` objects are stored and served with, such as
   * `public, max-age=31536000, immutable` when each upload gets a new key.
   * Public buckets, such as R2's on a custom domain, send it to CDNs and
   * browsers.
   *
   * `no-cache` by default. Without one, a CDN applies its own default TTL,
   * and browsers send `no-cache` with signed uploads anyway: they add it to
   * requests with `If-None-Match`, which makes those write-once.
   *
   * CDN rules can override it, such as Cloudflare Cache Rules set to
   * override origin or a CloudFront minimum TTL. Changing it here applies to
   * new objects only: stored ones keep theirs.
   */
  readonly cacheControl?: string | undefined;
}

/** The keys an asset definition takes: its key schema's type, or `Key`. */
export type KeyOf<D> = D extends { readonly key: KeySchema<infer K> } ? K : Key;

export type ContentTypeOf<D extends Definition<MediaType, unknown>> = D["contentTypes"][number];

// Literal ids and content types are checked when compiling; `make` checks
// again at runtime, for values typed as plain strings. The message types
// surface in the compiler error.

/** An id that is one key segment, or a message naming the problem. */
export type CheckId<Id extends string> = Id extends "" | "." | ".." | `${string}/${string}`
  ? "Asset ids must be one key segment, without `/` and not `.` or `..`"
  : Id;

/** A content type in lowercase without parameters, or a message naming the problem. */
export type CheckContentType<Type extends string> = Type extends
  | `${string};${string}`
  | `${string} ${string}`
  ? "Asset content types must have no parameters, such as `; charset=utf-8`"
  : Type extends `${string}${UppercaseLetter}${string}`
    ? "Asset content types must be lowercase"
    : Type;

// Spelled out rather than compared with Lowercase<Type>, which also rejects
// types with a `${string}` part.
type UppercaseLetter = Uppercase<
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
>;

export class InvalidKey extends Schema.TaggedError<InvalidKey, { readonly brand: unique symbol }>()(
  "AssetInvalidKey",
  { asset: Schema.String, reason: Schema.String },
  { httpApiStatus: 400 },
) {}

export class UnsupportedContentType extends Schema.TaggedError<
  UnsupportedContentType,
  { readonly brand: unique symbol }
>()(
  "AssetUnsupportedContentType",
  { asset: Schema.String, contentType: Schema.String },
  { httpApiStatus: 415 },
) {}

/** A body is longer or shorter than the `contentLength` declared for it. */
export class ContentLengthMismatch extends Schema.TaggedError<
  ContentLengthMismatch,
  { readonly brand: unique symbol }
>()(
  "AssetContentLengthMismatch",
  { asset: Schema.String, contentLength: Schema.ByteSize },
  { httpApiStatus: 400 },
) {}

export class TooLarge extends Schema.TaggedError<TooLarge, { readonly brand: unique symbol }>()(
  "AssetTooLarge",
  { asset: Schema.String, maxSize: Schema.ByteSize },
  { httpApiStatus: 413 },
) {}

/**
 * A stored object's content type is not one the asset accepts, such as one
 * written by other code or under an older definition.
 */
export class UnexpectedContentType extends Schema.TaggedError<
  UnexpectedContentType,
  { readonly brand: unique symbol }
>()("AssetUnexpectedContentType", {
  asset: Schema.String,
  /** The key in the store, with the asset id prefix. */
  key: Schema.String,
  contentType: Schema.String,
}) {}

export interface Info<Type extends MediaType> extends AssetBucket.Info {
  readonly contentType: Type;
}

export interface StoredObject<Type extends MediaType> extends AssetBucket.StoredObject {
  readonly info: Info<Type>;
}

export type ReadError = InvalidKey | UnexpectedContentType | AssetBucket.AssetBucketError;

/** What `toLayer` helpers need of an asset. */
export interface Any {
  readonly id: string;
  readonly bucket: AssetBucket.Any;
}

/** The bucket service an asset requires. */
export type BucketOf<A> = A extends { readonly bucket: AssetBucket.Tag<infer B> } ? B : never;

export interface Asset<Id extends string, Type extends MediaType, K, B> {
  readonly id: Id;
  readonly bucket: AssetBucket.Tag<B>;
  readonly contentTypes: ReadonlyArray<Type>;
  readonly maxSize: ByteSize.ByteSize;
  readonly cacheControl: string;
  /**
   * Decodes an untrusted key, such as a path parameter, to one the asset
   * accepts, checking that the stored key is portable.
   */
  readonly Key: KeySchema<K>;
  /**
   * Decodes an untrusted content type, such as a request header, to one the
   * asset accepts. Ignores case, whitespace and parameters such as `charset`.
   */
  readonly ContentType: Schema.Codec<Type, string>;
  readonly put: <E>(
    key: K,
    body: Stream.Stream<Uint8Array, E>,
    options: {
      readonly contentType: Type;
      /**
       * The body's length, such as a request's `Content-Length`. A length
       * over `maxSize` fails before the body is read, and the bucket can
       * stream a body of known length.
       */
      readonly contentLength?: ByteSize.ByteSize | undefined;
    },
  ) => Effect.Effect<
    Info<Type>,
    | InvalidKey
    | UnsupportedContentType
    | TooLarge
    | ContentLengthMismatch
    | AssetBucket.AssetBucketError
    | E,
    B
  >;
  readonly get: (key: K) => Effect.Effect<Option.Option<StoredObject<Type>>, ReadError, B>;
  readonly head: (key: K) => Effect.Effect<Option.Option<Info<Type>>, ReadError, B>;
  readonly delete: (key: K) => Effect.Effect<void, InvalidKey | AssetBucket.AssetBucketError, B>;
  /** The key the object is stored under in the bucket: `<id>/<encoded key>`, checked. */
  readonly storedKey: (key: K) => Effect.Effect<string, InvalidKey>;
  /**
   * Checks a content type and length as `put` does, for uploads that do not
   * pass through `put`, such as to presigned URLs.
   */
  readonly check: (upload: {
    readonly contentType: Type;
    readonly contentLength: ByteSize.ByteSize;
  }) => Effect.Effect<void, UnsupportedContentType | TooLarge>;
}

const essence = (contentType: string) => contentType.replace(/;.*/su, "").trim().toLowerCase();

/**
 * Defines a kind of asset. Objects are stored in the definition's bucket
 * under `<id>/<key>`, so several kinds can share a bucket.
 */
export const make = <const Id extends string, const D extends Definition<MediaType, unknown>, B>(
  checkedId: CheckId<Id>,
  definition: D & {
    readonly bucket: AssetBucket.Tag<B>;
    readonly contentTypes: ReadonlyArray<CheckContentType<ContentTypeOf<D>>>;
  },
): Asset<Id, ContentTypeOf<D>, KeyOf<D>, B> => {
  type Type = ContentTypeOf<D>;

  type K = KeyOf<D>;

  // SAFETY: CheckId<Id> is Id itself for every id the check below accepts.
  const id = checkedId as Id;

  if (!isSegment(id))
    throw new Error(`Asset id must be a single key segment: ${JSON.stringify(id)}`);

  const maxSize = Option.getOrThrowWith(
    ByteSize.fromInput(definition.maxSize),
    () => new Error(`Asset ${id} maxSize is not a byte size: ${String(definition.maxSize)}`),
  );

  for (const contentType of definition.contentTypes)
    if (essence(contentType) !== contentType)
      throw new Error(
        `Asset ${id} content types must be lowercase without parameters: ${JSON.stringify(contentType)}`,
      );

  const cacheControl = definition.cacheControl ?? "no-cache";

  const accepted: ReadonlySet<string> = new Set(definition.contentTypes);

  const isAccepted = (contentType: string): contentType is Type => accepted.has(contentType);

  const ContentType: Schema.Codec<Type, string> = Schema.String.pipe(
    Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transform(essence),
      encode: SchemaGetter.passthrough(),
    }),
    Schema.decodeTo(Schema.Literals(definition.contentTypes)),
  );

  // SAFETY: KeyOf<D> is the type of the definition's key schema, or Key without one.
  const keySchema = (definition.key ?? Key) as KeySchema<K>;

  const AssetKey: KeySchema<K> = Schema.String.check(portable(`${id}/`)).pipe(
    Schema.decodeTo(keySchema),
  );

  const encodeKey = Schema.encodeEffect(AssetKey);

  const locate = (key: K) =>
    encodeKey(key).pipe(
      Effect.mapError((error) => new InvalidKey({ asset: id, reason: error.message })),
      Effect.map((encoded) => `${id}/${encoded}`),
    );

  // Types can be bypassed, so `put` checks again what the compiler checked.
  const accept = (contentType: string) =>
    isAccepted(contentType)
      ? Effect.void
      : Effect.fail(new UnsupportedContentType({ asset: id, contentType }));

  const expect = <I extends AssetBucket.Info>(key: string, info: I) =>
    isAccepted(info.contentType)
      ? Effect.succeed({ ...info, contentType: info.contentType })
      : Effect.fail(new UnexpectedContentType({ asset: id, key, contentType: info.contentType }));

  const declared = (contentLength: ByteSize.ByteSize | undefined) =>
    contentLength !== undefined && contentLength > maxSize
      ? Effect.fail(new TooLarge({ asset: id, maxSize }))
      : Effect.void;

  // Fails a body over maxSize or its declared length as soon as it is, and
  // one shorter than its declared length at its end, before the bucket commits.
  const measure = <E>(
    body: Stream.Stream<Uint8Array, E>,
    contentLength: ByteSize.ByteSize | undefined,
  ): Stream.Stream<Uint8Array, E | TooLarge | ContentLengthMismatch> =>
    Stream.suspend(() => {
      let size = 0n;

      const check = (
        chunk: Uint8Array,
      ): Effect.Effect<Uint8Array, TooLarge | ContentLengthMismatch> => {
        size += BigInt(chunk.length);

        if (size > maxSize) return Effect.fail(new TooLarge({ asset: id, maxSize }));

        return contentLength !== undefined && size > contentLength
          ? Effect.fail(new ContentLengthMismatch({ asset: id, contentLength }))
          : Effect.succeed(chunk);
      };

      const counted = Stream.mapEffect(body, check);

      if (contentLength === undefined) return counted;

      const complete = Effect.suspend(() =>
        size === contentLength
          ? Effect.void
          : Effect.fail(new ContentLengthMismatch({ asset: id, contentLength })),
      );

      return Stream.concat(counted, Stream.fromEffectDrain(complete));
    });

  return {
    id,
    bucket: definition.bucket,
    contentTypes: definition.contentTypes,
    maxSize,
    cacheControl,
    Key: AssetKey,
    ContentType,
    put: (key, body, { contentType, contentLength }) =>
      Effect.gen(function* () {
        const stored = yield* locate(key);

        yield* accept(contentType);
        yield* declared(contentLength);

        const bucket = yield* definition.bucket;

        const info = yield* bucket.put({
          key: stored,
          contentType,
          cacheControl,
          body: measure(body, contentLength),
          contentLength,
        });

        return { ...info, contentType };
      }),
    get: (key) =>
      Effect.gen(function* () {
        const stored = yield* locate(key);
        const bucket = yield* definition.bucket;
        const object = yield* bucket.get(stored);

        if (Option.isNone(object)) return Option.none();

        const info = yield* expect(stored, object.value.info);

        return Option.some({ ...object.value, info });
      }),
    head: (key) =>
      Effect.gen(function* () {
        const stored = yield* locate(key);
        const bucket = yield* definition.bucket;
        const info = yield* bucket.head(stored);

        return Option.isNone(info) ? Option.none() : Option.some(yield* expect(stored, info.value));
      }),
    delete: (key) =>
      Effect.gen(function* () {
        const stored = yield* locate(key);
        const bucket = yield* definition.bucket;

        yield* bucket.delete(stored);
      }),
    storedKey: locate,
    check: ({ contentType, contentLength }) =>
      Effect.andThen(accept(contentType), declared(contentLength)),
  };
};
