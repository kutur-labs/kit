import { Effect, FileSystem, Layer, Option, Path, Schema, Stream } from "effect";

import * as AssetBucket from "./AssetBucket.ts";

export interface Options {
  /** The directory holding the bucket's files. It is created when needed. */
  readonly directory: string;
}

// What a stored object's record holds. `file` names the body's file, a new
// one for each write, so a replacement is visible only once its record is.
const Entry = Schema.Struct({
  key: Schema.String,
  contentType: Schema.String,
  cacheControl: Schema.optional(Schema.String),
  size: Schema.ByteSize,
  file: Schema.String,
});

const EntryJson = Schema.fromJsonString(Schema.toCodecJson(Entry));

const infoOf = (entry: typeof Entry.Type): AssetBucket.Info => ({
  size: entry.size,
  contentType: entry.contentType,
  cacheControl: entry.cacheControl,
});

class BodyFailure<E> {
  constructor(readonly error: E) {}
}

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Backs a bucket with files under a directory, for development and tests
 * without object storage. Keys are stored by their SHA-256, so any key fits
 * any file system: case-insensitive ones and Windows included. Writes are
 * atomic for one process; concurrent writers to one key may leave unused
 * files behind.
 */
export const layer = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: Options,
): Layer.Layer<Self, never, FileSystem.FileSystem | Path.Path> =>
  Layer.effect(
    bucket,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const failure =
        (operation: AssetBucket.AssetBucketError["operation"], key: string) => (cause: unknown) =>
          new AssetBucket.AssetBucketError({ operation, bucket: bucket.id, key, cause });

      // Two hex characters of the hash shard the directory, as Git does.
      const locate = (key: string) =>
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))).pipe(
          Effect.map((digest) => {
            const hash = hex(digest);
            const directory = path.join(options.directory, hash.slice(0, 2));

            return { directory, hash, record: path.join(directory, `${hash}.json`) };
          }),
        );

      const read = (key: string, operation: AssetBucket.AssetBucketError["operation"]) =>
        Effect.gen(function* () {
          const { directory, record } = yield* locate(key);

          const json = yield* fs.readFileString(record).pipe(
            Effect.asSome,
            Effect.catchReason("PlatformError", "NotFound", () => Effect.succeedNone),
          );

          if (Option.isNone(json)) return Option.none();

          const entry = yield* Schema.decodeEffect(EntryJson)(json.value);

          return Option.some({ entry, file: path.join(directory, entry.file) });
        }).pipe(Effect.mapError(failure(operation, key)));

      return bucket.of({
        put: ({ key, contentType, cacheControl, body }) =>
          Effect.gen(function* () {
            const { directory, hash, record } = yield* locate(key).pipe(
              Effect.tap(({ directory }) => fs.makeDirectory(directory, { recursive: true })),
              Effect.mapError(failure("put", key)),
            );

            const previous = yield* read(key, "put");
            const version = crypto.randomUUID();
            const file = `${hash}.${version}`;
            const target = path.join(directory, file);

            // Body errors pass through the sink, so they are wrapped to keep
            // them apart from the file system's.
            const size = yield* Stream.run(
              Stream.mapError(body, (error) => new BodyFailure(error)),
              fs.sink(target),
            ).pipe(
              Effect.andThen(fs.stat(target)),
              Effect.mapError((error) =>
                error instanceof BodyFailure ? error.error : failure("put", key)(error),
              ),
              Effect.map((info) => info.size),
              Effect.onError(() => Effect.ignore(fs.remove(target, { force: true }))),
            );

            const entry = { key, contentType, cacheControl, size, file };
            const staged = `${record}.${version}`;

            yield* Schema.encodeEffect(EntryJson)(entry).pipe(
              Effect.flatMap((json) => fs.writeFileString(staged, json)),
              Effect.andThen(fs.rename(staged, record)),
              Effect.onError(() =>
                Effect.ignore(
                  Effect.all([
                    fs.remove(staged, { force: true }),
                    fs.remove(target, { force: true }),
                  ]),
                ),
              ),
              Effect.mapError(failure("put", key)),
            );

            // The replaced body is no longer referenced. Leaving it on failure
            // costs only disk space.
            yield* Option.match(previous, {
              onNone: () => Effect.void,
              onSome: ({ file }) => Effect.ignore(fs.remove(file, { force: true })),
            });

            return { size: entry.size, contentType, cacheControl };
          }),
        get: (key) =>
          Effect.map(
            read(key, "get"),
            Option.map(({ entry, file }) => ({
              info: infoOf(entry),
              body: Stream.mapError(fs.stream(file), failure("get", key)),
            })),
          ),
        head: (key) =>
          Effect.map(
            read(key, "head"),
            Option.map(({ entry }) => infoOf(entry)),
          ),
        delete: (key) =>
          Effect.gen(function* () {
            const stored = yield* read(key, "delete");

            if (Option.isNone(stored)) return;

            const { record } = yield* locate(key);

            yield* fs
              .remove(record, { force: true })
              .pipe(
                Effect.andThen(fs.remove(stored.value.file, { force: true })),
                Effect.mapError(failure("delete", key)),
              );
          }),
      });
    }),
  );
