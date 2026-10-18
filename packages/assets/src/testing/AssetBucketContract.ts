import { ByteSize, Effect, Option, Result, Schema, Stream } from "effect";

import * as AssetBucket from "../AssetBucket.ts";

/** The bucket the cases use. Back it with the implementation under test. */
export class ContractBucket extends AssetBucket.Service<ContractBucket>()("assets-contract") {}

/**
 * Checks an `AssetBucket.Bucket` implementation against the guarantees it
 * documents. Cases overwrite or delete the keys they use, under `contract/`.
 * Run each case with any test runner.
 */
export interface Case {
  readonly name: string;
  readonly run: Effect.Effect<void, never, ContractBucket>;
}

const text = (value: string) => new TextEncoder().encode(value);

const put = (
  key: string,
  chunks: ReadonlyArray<string>,
  contentType = "text/plain",
  cacheControl?: string,
) =>
  Effect.flatMap(ContractBucket, (bucket) =>
    bucket.put({ key, contentType, cacheControl, body: Stream.fromIterable(chunks.map(text)) }),
  );

// The stored body as text, or null when the object is missing.
const read = (key: string) =>
  Effect.flatMap(ContractBucket, (bucket) => bucket.get(key)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(null),
        onSome: ({ body }) =>
          Stream.runCollect(body).pipe(
            Effect.map((chunks) => chunks.map((chunk) => new TextDecoder().decode(chunk)).join("")),
          ),
      }),
    ),
  );

const head = (key: string) => Effect.flatMap(ContractBucket, (bucket) => bucket.head(key));

const remove = (key: string) => Effect.flatMap(ContractBucket, (bucket) => bucket.delete(key));

const expectEqual = <A>(label: string, expected: A, received: A) => {
  const [want, got] = [expected, received].map((value) => JSON.stringify(value));

  return want === got
    ? Effect.void
    : Effect.die(
        new Error(`AssetBucket contract violated: ${label}\nexpected: ${want}\nreceived: ${got}`),
      );
};

const expectBody = (key: string, expected: string | null) =>
  Effect.flatMap(read(key), (body) => expectEqual(`body of ${key}`, expected, body));

// Encoding checks that sizes are ByteSize values and drops fields stores may add.
const encodeInfo = Schema.encodeEffect(
  Schema.toCodecJson(
    Schema.NullOr(
      Schema.Struct({
        size: Schema.ByteSize,
        contentType: Schema.String,
        cacheControl: Schema.optionalKey(Schema.String),
      }),
    ),
  ),
);

// No cache control compares equal whether a store omits it or sets it to undefined.
const comparable = (info: AssetBucket.Info | null) => {
  if (info === null) return null;

  const { size, contentType, cacheControl } = info;

  return cacheControl === undefined ? { size, contentType } : { size, contentType, cacheControl };
};

const expectInfo = (
  label: string,
  expected: AssetBucket.Info | null,
  received: AssetBucket.Info | null,
) =>
  Effect.flatMap(
    Effect.all([encodeInfo(comparable(expected)), encodeInfo(comparable(received))]),
    ([want, got]) => expectEqual(label, want, got),
  ).pipe(Effect.orDie);

const expectHead = (key: string, expected: AssetBucket.Info | null) =>
  Effect.flatMap(head(key), (info) =>
    expectInfo(`head of ${key}`, expected, Option.getOrNull(info)),
  );

const stored = "contract/stored.txt";

const nested = "contract/nested";

const child = "contract/nested/child";

export const cases: ReadonlyArray<Case> = [
  {
    name: "returns the stored bytes and info",
    run: Effect.gen(function* () {
      const info = yield* put(stored, ["hello, ", "", "wörld"], "text/plain; charset=utf-8");
      const expected = { size: ByteSize.bytes(13), contentType: "text/plain; charset=utf-8" };
      yield* expectInfo("put info", expected, info);
      yield* expectHead(stored, expected);
      yield* expectBody(stored, "hello, wörld");

      const object = yield* Effect.flatMap(ContractBucket, (bucket) => bucket.get(stored));

      yield* expectInfo(
        `get info of ${stored}`,
        expected,
        Option.getOrNull(Option.map(object, ({ info }) => info)),
      );
    }).pipe(Effect.orDie),
  },
  {
    name: "stores empty objects",
    run: Effect.gen(function* () {
      yield* put(stored, [], "application/octet-stream");
      yield* expectHead(stored, { size: ByteSize.zero, contentType: "application/octet-stream" });
      yield* expectBody(stored, "");
    }).pipe(Effect.orDie),
  },
  {
    name: "replaces an object on put",
    run: Effect.gen(function* () {
      yield* put(stored, ["first version"]);
      yield* put(stored, ["second"], "text/markdown");
      yield* expectHead(stored, { size: ByteSize.bytes(6), contentType: "text/markdown" });
      yield* expectBody(stored, "second");
    }).pipe(Effect.orDie),
  },
  {
    name: "stores the cache control an object is served with, and replaces it on put",
    run: Effect.gen(function* () {
      const immutable = "public, max-age=31536000, immutable";
      const info = yield* put(stored, ["cached"], "text/plain", immutable);

      const expected = {
        size: ByteSize.bytes(6),
        contentType: "text/plain",
        cacheControl: immutable,
      };

      yield* expectInfo("put info", expected, info);
      yield* expectHead(stored, expected);

      const object = yield* Effect.flatMap(ContractBucket, (bucket) => bucket.get(stored));

      yield* expectInfo(
        `get info of ${stored}`,
        expected,
        Option.getOrNull(Option.map(object, ({ info }) => info)),
      );

      yield* put(stored, ["uncached"]);
      yield* expectHead(stored, { size: ByteSize.bytes(8), contentType: "text/plain" });
    }).pipe(Effect.orDie),
  },
  {
    name: "keeps a key and the keys nested under it apart",
    run: Effect.gen(function* () {
      yield* put(nested, ["parent"]);
      yield* put(child, ["child"]);
      yield* remove(child);
      yield* expectBody(nested, "parent");
      yield* expectBody(child, null);
      yield* put(child, ["child"]);
      yield* remove(nested);
      yield* expectBody(child, "child");
    }).pipe(Effect.orDie),
  },
  {
    name: "reports missing objects and deletes them more than once",
    run: Effect.gen(function* () {
      yield* put(stored, ["to delete"]);
      yield* remove(stored);
      yield* expectHead(stored, null);
      yield* expectBody(stored, null);
      yield* remove(stored);
    }).pipe(Effect.orDie),
  },
  {
    name: "keeps the previous object when a body fails",
    run: Effect.gen(function* () {
      yield* put(stored, ["previous"]);

      const failing = Stream.concat(
        Stream.make(text("partial")),
        Stream.fail("body failed" as const),
      );

      const bucket = yield* ContractBucket;

      const result = yield* Effect.result(
        bucket.put({ key: stored, contentType: "text/plain", body: failing }),
      );

      yield* expectEqual(
        "error of a put whose body failed",
        "body failed",
        Result.isFailure(result) ? result.failure : "success",
      );
      yield* expectHead(stored, { size: ByteSize.bytes(8), contentType: "text/plain" });
      yield* expectBody(stored, "previous");
    }).pipe(Effect.orDie),
  },
];
