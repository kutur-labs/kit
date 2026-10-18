import { it } from "@effect/vitest";
import { ByteSize, Cause, Effect, Exit, Layer, Option, Stream } from "effect";
import { expect } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as Memory from "../src/memory.ts";
import { AssetBucketContract } from "../src/testing/index.ts";

const { ContractBucket } = AssetBucketContract;

for (const { name, run } of AssetBucketContract.cases)
  it.effect(`memory bucket ${name}`, () => run.pipe(Effect.provide(Memory.layer(ContractBucket))));

class Public extends AssetBucket.Service<Public>()("public") {}

class Private extends AssetBucket.Service<Private>()("private") {}

const body = Stream.make(new Uint8Array([1]));

const put = <Self>(bucket: AssetBucket.Tag<Self>) =>
  Effect.flatMap(bucket, (store) =>
    store.put({ key: "k", contentType: "application/octet-stream", body }),
  );

const has = <Self>(bucket: AssetBucket.Tag<Self>) =>
  Effect.map(
    Effect.flatMap(bucket, (store) => store.head("k")),
    Option.isSome,
  );

it.effect("keeps objects to each bucket and layer instance", () =>
  Effect.gen(function* () {
    yield* put(Public);

    expect(yield* has(Public)).toBe(true);
    expect(yield* has(Private)).toBe(false);
    expect(yield* has(Public).pipe(Effect.provide(Memory.layer(Public)))).toBe(false);
  }).pipe(Effect.provide(Layer.merge(Memory.layer(Public), Memory.layer(Private)))),
);

const definition = { contentTypes: ["image/png"], maxSize: 1 } as const;

const Avatar = Asset.make("avatar", { ...definition, bucket: Public });

const Logo = Asset.make("logo", { ...definition, bucket: Public });

const Scan = Asset.make("scan", { ...definition, bucket: Private });

it.effect("backs the buckets of the given assets, sharing a store per bucket", () =>
  Effect.gen(function* () {
    const key = Asset.Key.make("a.png");

    yield* Avatar.put(key, body, { contentType: "image/png" });
    yield* Logo.put(key, body, { contentType: "image/png" });

    const public_ = yield* Public;

    expect(Option.isSome(yield* public_.head("avatar/a.png"))).toBe(true);
    expect(Option.isSome(yield* public_.head("logo/a.png"))).toBe(true);
    expect(Option.isNone(yield* Scan.head(key))).toBe(true);
  }).pipe(Effect.provide(Memory.toLayer([Avatar, Logo, Scan]))),
);

it.effect("copies bodies in and out, so callers cannot change stored bytes", () =>
  Effect.gen(function* () {
    const bucket = yield* Public;
    const chunk = new Uint8Array([1, 2]);

    yield* bucket.put({
      key: "k",
      contentType: "application/octet-stream",
      body: Stream.make(chunk),
    });
    chunk.fill(0);

    const read = Effect.flatMap(bucket.get("k"), (object) =>
      Option.isSome(object) ? Stream.runCollect(object.value.body) : Effect.succeed([]),
    );

    for (const received of yield* read) received.fill(0);

    expect(yield* read).toEqual([new Uint8Array([1, 2])]);
  }).pipe(Effect.provide(Memory.layer(Public))),
);

// Each defect breaks a guarantee a contract case names, so that case must fail.
const broken = (change: (bucket: AssetBucket.Bucket) => Partial<AssetBucket.Bucket>) =>
  Layer.effect(
    ContractBucket,
    Effect.map(ContractBucket, (bucket) => ({ ...bucket, ...change(bucket) })),
  ).pipe(Layer.provide(Memory.layer(ContractBucket)));

const defects = [
  {
    breaks: "keeps a key and the keys nested under it apart",
    defect: "deletes nested keys with their parent",
    layer: broken((bucket) => ({
      delete: (key) => Effect.flatMap(bucket.delete(key), () => bucket.delete(`${key}/child`)),
    })),
  },
  {
    breaks: "keeps the previous object when a body fails",
    defect: "stores what arrived before the body failed",
    layer: broken((bucket) => ({
      put: (input) => {
        const received: Array<Uint8Array> = [];

        return Stream.runForEach(input.body, (chunk) =>
          Effect.sync(() => received.push(chunk)),
        ).pipe(
          Effect.onError(() =>
            Effect.ignore(bucket.put({ ...input, body: Stream.fromIterable(received) })),
          ),
          Effect.andThen(() => bucket.put({ ...input, body: Stream.fromIterable(received) })),
        );
      },
    })),
  },
  {
    breaks: "keeps the previous object when a body fails",
    defect: "reports success for a body that failed",
    layer: broken((bucket) => ({
      put: (input) =>
        bucket.put({ ...input, body: input.body.pipe(Stream.catchCause(() => Stream.empty)) }),
    })),
  },
  {
    breaks: "reports missing objects and deletes them more than once",
    defect: "fails to delete missing objects",
    layer: broken((bucket) => ({
      delete: (key) =>
        Effect.flatMap(bucket.head(key), (info) =>
          Option.isSome(info)
            ? bucket.delete(key)
            : Effect.fail(
                new AssetBucket.AssetBucketError({
                  operation: "delete",
                  bucket: ContractBucket.id,
                  key,
                  cause: "missing",
                }),
              ),
        ),
    })),
  },
  {
    breaks: "returns the stored bytes and info",
    defect: "drops content type parameters",
    layer: broken((bucket) => ({
      put: (input) => bucket.put({ ...input, contentType: input.contentType.replace(/;.*$/u, "") }),
    })),
  },
  {
    breaks: "stores empty objects",
    defect: "skips empty bodies",
    layer: broken((bucket) => ({
      put: (input) =>
        Effect.flatMap(Stream.runCollect(input.body), (chunks) =>
          chunks.some((chunk) => chunk.length > 0)
            ? bucket.put({ ...input, body: Stream.fromIterable(chunks) })
            : Effect.succeed({ size: ByteSize.zero, contentType: input.contentType }),
        ),
    })),
  },
  {
    breaks: "replaces an object on put",
    defect: "keeps the first object written under a key",
    layer: broken((bucket) => ({
      put: (input) =>
        Effect.flatMap(bucket.head(input.key), (info) =>
          Option.isSome(info) ? Effect.succeed(info.value) : bucket.put(input),
        ),
    })),
  },
];

for (const { breaks, defect, layer } of defects)
  it.effect(`the contract case "${breaks}" fails a bucket that ${defect}`, () =>
    Effect.gen(function* () {
      const failing = yield* Effect.forEach(AssetBucketContract.cases, (contractCase) =>
        contractCase.run.pipe(
          Effect.provide(layer),
          Effect.exit,
          Effect.map((exit) => (Exit.isFailure(exit) ? [contractCase.name] : [])),
        ),
      );

      expect(failing.flat()).toContain(breaks);
    }),
  );

it.effect("names the failed check with the expected and received values", () =>
  Effect.gen(function* () {
    const violation = (breaks: string, defect: string) => {
      const contractCase = AssetBucketContract.cases.find(({ name }) => name === breaks);
      const layer = defects.find((entry) => entry.defect === defect)?.layer;

      return contractCase === undefined || layer === undefined
        ? Effect.die(new Error(`no case ${breaks} or defect ${defect}`))
        : contractCase.run.pipe(
            Effect.provide(layer),
            Effect.exit,
            Effect.map((exit) => (Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : "")),
          );
    };

    expect(
      yield* violation("replaces an object on put", "keeps the first object written under a key"),
    ).toContain(
      'AssetBucket contract violated: head of contract/stored.txt\nexpected: {"size":"6","contentType":"text/markdown"}\nreceived: {"size":"13","contentType":"text/plain"}',
    );
    expect(
      yield* violation(
        "keeps a key and the keys nested under it apart",
        "deletes nested keys with their parent",
      ),
    ).toContain(
      'AssetBucket contract violated: body of contract/nested/child\nexpected: "child"\nreceived: null',
    );
  }),
);
