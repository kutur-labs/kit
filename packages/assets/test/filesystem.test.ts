import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodePath from "@effect/platform-node/NodePath";
import { it } from "@effect/vitest";
import { ByteSize, Effect, FileSystem, Layer, Option, Stream } from "effect";
import { expect } from "vitest";

import * as AssetBucket from "../src/AssetBucket.ts";
import * as Filesystem from "../src/filesystem.ts";
import { AssetBucketContract } from "../src/testing/index.ts";

const { ContractBucket } = AssetBucketContract;

// Imported by module rather than from the package index, which also loads
// modules needing optional peers such as redis.
const Node = Layer.merge(NodeFileSystem.layer, NodePath.layer);

/** A fresh directory for the test, removed after it. */
const directory = Effect.flatMap(FileSystem.FileSystem, (fs) => fs.makeTempDirectoryScoped());

const bucketIn = (path: string) => Filesystem.layer(ContractBucket, { directory: path });

for (const { name, run } of AssetBucketContract.cases)
  it.effect(`filesystem bucket ${name}`, () =>
    Effect.gen(function* () {
      yield* run.pipe(Effect.provide(bucketIn(yield* directory)));
    }).pipe(Effect.scoped, Effect.provide(Node)),
  );

const text = (value: string) => Stream.make(new TextEncoder().encode(value));

const put = (key: string, value: string, contentType = "text/plain") =>
  Effect.flatMap(ContractBucket, (bucket) => bucket.put({ key, contentType, body: text(value) }));

const read = (key: string) =>
  Effect.flatMap(ContractBucket, (bucket) => bucket.get(key)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(null),
        onSome: ({ body }) =>
          Effect.map(Stream.runCollect(body), (chunks) =>
            chunks.map((chunk) => new TextDecoder().decode(chunk)).join(""),
          ),
      }),
    ),
  );

/** Every file under the directory, so tests can see what writes leave behind. */
const files = (path: string) =>
  Effect.flatMap(FileSystem.FileSystem, (fs) =>
    Effect.flatMap(fs.readDirectory(path, { recursive: true }), (entries) =>
      Effect.filter(entries, (entry) =>
        Effect.map(fs.stat(`${path}/${entry}`), (info) => info.type === "File"),
      ),
    ),
  );

it.effect("keeps objects in the directory across layers, as a restart would", () =>
  Effect.gen(function* () {
    const path = yield* directory;

    yield* put("avatar/ada.png", "png!", "image/png").pipe(Effect.provide(bucketIn(path)));

    const info = yield* Effect.flatMap(ContractBucket, (bucket) =>
      bucket.head("avatar/ada.png"),
    ).pipe(Effect.provide(bucketIn(path)));

    expect(Option.getOrNull(info)).toEqual({ size: ByteSize.bytes(4), contentType: "image/png" });
    expect(yield* read("avatar/ada.png").pipe(Effect.provide(bucketIn(path)))).toBe("png!");
  }).pipe(Effect.scoped, Effect.provide(Node)),
);

it.effect("keeps keys apart that differ only in case or are as long as keys get", () =>
  Effect.gen(function* () {
    const longest = "a".repeat(1024);

    yield* put("Avatar.png", "upper");
    yield* put("avatar.png", "lower");
    yield* put(longest, "long");

    expect(yield* read("Avatar.png")).toBe("upper");
    expect(yield* read("avatar.png")).toBe("lower");
    expect(yield* read(longest)).toBe("long");
  }).pipe(
    Effect.provide(Layer.unwrap(Effect.map(directory, bucketIn))),
    Effect.scoped,
    Effect.provide(Node),
  ),
);

it.effect("leaves only the current object's files after replacing, failing and deleting", () =>
  Effect.gen(function* () {
    const path = yield* directory;

    const bucket = yield* Effect.provide(ContractBucket.use(Effect.succeed), bucketIn(path));

    yield* bucket.put({ key: "a", contentType: "text/plain", body: text("first") });
    yield* bucket.put({ key: "a", contentType: "text/plain", body: text("second") });

    const failing = Stream.concat(text("partial"), Stream.fail("body failed"));

    yield* Effect.flip(bucket.put({ key: "a", contentType: "text/plain", body: failing }));

    // One record and one body.
    expect(yield* files(path)).toHaveLength(2);

    yield* bucket.delete("a");

    expect(yield* files(path)).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(Node)),
);

it.effect("fails reads of a record it cannot decode rather than guessing", () =>
  Effect.gen(function* () {
    const path = yield* directory;
    const fs = yield* FileSystem.FileSystem;
    const bucket = yield* Effect.provide(ContractBucket.use(Effect.succeed), bucketIn(path));

    yield* bucket.put({ key: "a", contentType: "text/plain", body: text("a") });

    const [record] = (yield* files(path)).filter((file) => file.endsWith(".json"));

    yield* fs.writeFileString(`${path}/${record}`, "{}");

    const error = yield* Effect.flip(bucket.head("a"));

    expect(error).toBeInstanceOf(AssetBucket.AssetBucketError);
    expect(error).toMatchObject({ operation: "head", bucket: "assets-contract", key: "a" });
  }).pipe(Effect.scoped, Effect.provide(Node)),
);

it.effect("reports storage failures with the operation, bucket and key", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* directory;

    // A file where the bucket expects its directory fails every operation.
    yield* fs.writeFileString(`${path}/bucket`, "");

    const bucket = yield* Effect.provide(
      ContractBucket.use(Effect.succeed),
      bucketIn(`${path}/bucket`),
    );

    const errors = yield* Effect.all([
      Effect.flip(bucket.put({ key: "a", contentType: "text/plain", body: text("a") })),
      Effect.flip(bucket.get("a")),
      Effect.flip(bucket.head("a")),
      Effect.flip(bucket.delete("a")),
    ]);

    expect(errors.map((error) => [error._tag, error.operation, error.bucket, error.key])).toEqual(
      ["put", "get", "head", "delete"].map((operation) => [
        "AssetBucketError",
        operation,
        "assets-contract",
        "a",
      ]),
    );
  }).pipe(Effect.scoped, Effect.provide(Node)),
);
