import { it } from "@effect/vitest";
import { ByteSize, Effect, Layer, Option, Schema, Stream } from "effect";
import { expect, it as test } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as Memory from "../src/memory.ts";

class Public extends AssetBucket.Service<Public>()("public") {}

class Private extends AssetBucket.Service<Private>()("private") {}

const Buckets = Layer.merge(Memory.layer(Public), Memory.layer(Private));

const Avatar = Asset.make("avatar", {
  bucket: Public,
  contentTypes: ["image/png", "image/jpeg"],
  maxSize: 4,
});

const key = (value: string) => Asset.Key.make(value);

const bytes = (...chunks: ReadonlyArray<string>) =>
  Stream.fromIterable(chunks.map((chunk) => new TextEncoder().encode(chunk)));

const read = (value: string) =>
  Avatar.get(key(value)).pipe(
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

it.effect("stores objects in its bucket under the asset id and returns their info", () =>
  Effect.gen(function* () {
    // Without a cache control in the definition, objects are stored with `no-cache`.
    const stored = { size: ByteSize.bytes(4), contentType: "image/png", cacheControl: "no-cache" };
    const ada = key("users/ada.png");

    expect(yield* Avatar.put(ada, bytes("ab", "cd"), { contentType: "image/png" })).toEqual(stored);

    const store = yield* Public;

    expect(Option.getOrNull(yield* store.head("avatar/users/ada.png"))).toEqual(stored);
    expect(Option.getOrNull(yield* Avatar.head(ada))).toEqual(stored);
    expect(Option.map(yield* Avatar.get(ada), ({ info }) => info)).toEqual(Option.some(stored));
    expect(yield* read("users/ada.png")).toBe("abcd");
  }).pipe(Effect.provide(Buckets)),
);

test("decodes untrusted content types regardless of case, whitespace and parameters", () => {
  const decode = Schema.decodeUnknownSync(Avatar.ContentType);

  expect(decode(" IMAGE/JPEG ; quality=high")).toBe("image/jpeg");
  expect(decode("image/png")).toBe("image/png");

  for (const contentType of ["text/html", "image/pngx", "image/svg+xml", "", 1])
    expect(() => decode(contentType)).toThrow();
});

it.effect("rejects other content types without reading the body, as the types do", () =>
  Effect.gen(function* () {
    const unread = Stream.fromEffect(Effect.die("body was read"));

    for (const contentType of ["text/html", "IMAGE/PNG", "image/png; q=1", "image/pngx"]) {
      const error = yield* Effect.flip(
        // SAFETY: deliberately bypasses the type check the runtime check backs up.
        Avatar.put(key("a.png"), unread, { contentType: contentType as "image/png" }),
      );

      expect(error).toEqual(new Asset.UnsupportedContentType({ asset: "avatar", contentType }));
    }

    expect(yield* Avatar.head(key("a.png"))).toEqual(Option.none());
  }).pipe(Effect.provide(Buckets)),
);

it.effect("rejects bodies over maxSize and keeps the previous object", () =>
  Effect.gen(function* () {
    yield* Avatar.put(key("a.png"), bytes("ab", "cd"), { contentType: "image/png" });

    const error = yield* Effect.flip(
      Avatar.put(key("a.png"), bytes("abc", "de"), { contentType: "image/png" }),
    );

    expect(error).toEqual(new Asset.TooLarge({ asset: "avatar", maxSize: ByteSize.bytes(4) }));
    expect(yield* read("a.png")).toBe("abcd");
  }).pipe(Effect.provide(Buckets)),
);

it.effect("rejects a declared length over maxSize without reading the body", () =>
  Effect.gen(function* () {
    const unread = Stream.fromEffect(Effect.die("body was read"));

    const error = yield* Effect.flip(
      Avatar.put(key("a.png"), unread, {
        contentType: "image/png",
        contentLength: ByteSize.bytes(5),
      }),
    );

    expect(error).toEqual(new Asset.TooLarge({ asset: "avatar", maxSize: ByteSize.bytes(4) }));
  }).pipe(Effect.provide(Buckets)),
);

it.effect("accepts a declared length of exactly maxSize", () =>
  Effect.gen(function* () {
    yield* Avatar.put(key("a.png"), bytes("abcd"), {
      contentType: "image/png",
      contentLength: ByteSize.bytes(4),
    });

    expect(yield* read("a.png")).toBe("abcd");
  }).pipe(Effect.provide(Buckets)),
);

it.effect("stops reading a body once it passes its declared length", () =>
  Effect.gen(function* () {
    const longer = Stream.concat(bytes("abc"), Stream.fromEffect(Effect.die("body read too far")));

    const error = yield* Effect.flip(
      Avatar.put(key("a.png"), longer, {
        contentType: "image/png",
        contentLength: ByteSize.bytes(2),
      }),
    );

    expect(error).toEqual(
      new Asset.ContentLengthMismatch({ asset: "avatar", contentLength: ByteSize.bytes(2) }),
    );
  }).pipe(Effect.provide(Buckets)),
);

it.effect(
  "rejects bodies longer or shorter than their declared length and keeps the previous object",
  () =>
    Effect.gen(function* () {
      yield* Avatar.put(key("a.png"), bytes("ab"), { contentType: "image/png" });

      for (const body of [bytes("abc"), bytes("a"), bytes("")]) {
        const error = yield* Effect.flip(
          Avatar.put(key("a.png"), body, {
            contentType: "image/png",
            contentLength: ByteSize.bytes(2),
          }),
        );

        expect(error).toEqual(
          new Asset.ContentLengthMismatch({ asset: "avatar", contentLength: ByteSize.bytes(2) }),
        );
      }

      yield* Avatar.put(key("a.png"), bytes("c", "d"), {
        contentType: "image/png",
        contentLength: ByteSize.bytes(2),
      });

      expect(yield* read("a.png")).toBe("cd");
    }).pipe(Effect.provide(Buckets)),
);

it.effect("passes the declared length to the bucket", () =>
  Effect.gen(function* () {
    const lengths: Array<ByteSize.ByteSize | undefined> = [];

    const recording = Layer.effect(
      Public,
      Effect.map(Public, (bucket) => ({
        ...bucket,
        put: <E>(input: AssetBucket.PutInput<E>) => {
          lengths.push(input.contentLength);

          return bucket.put(input);
        },
      })),
    ).pipe(Layer.provide(Memory.layer(Public)));

    const options = { contentType: "image/png" } as const;

    yield* Effect.provide(
      Effect.andThen(
        Avatar.put(key("a.png"), bytes("ab"), { ...options, contentLength: ByteSize.bytes(2) }),
        Avatar.put(key("a.png"), bytes("ab"), options),
      ),
      recording,
    );

    expect(lengths).toEqual([ByteSize.bytes(2), undefined]);
  }),
);

it.effect("reads maxSize in units, such as kilobytes", () =>
  Effect.gen(function* () {
    const Document = Asset.make("document", {
      bucket: Private,
      contentTypes: ["application/pdf"],
      maxSize: "1 kB",
    });

    const options = { contentType: "application/pdf" } as const;

    yield* Document.put(key("a.pdf"), bytes("a".repeat(1000)), options);

    expect(
      yield* Effect.flip(Document.put(key("a.pdf"), bytes("a".repeat(1001)), options)),
    ).toEqual(new Asset.TooLarge({ asset: "document", maxSize: ByteSize.bytes(1000) }));
  }).pipe(Effect.provide(Buckets)),
);

test("decodes untrusted keys, counting the asset id towards the length limit", () => {
  const decode = Schema.decodeUnknownSync(Avatar.Key);

  // `avatar/` takes 7 of the 1024 bytes a stored key may have, in segments of
  // at most 255.
  const segment = "a".repeat(255);
  const longest = `${segment}/${segment}/${segment}/${"a".repeat(249)}`;

  expect(longest).toHaveLength(1017);
  expect(decode(longest)).toBe(longest);
  expect(decode(segment)).toBe(segment);
  expect(decode("Users/ada-1_(copy)!/v2.0'.png")).toBe("Users/ada-1_(copy)!/v2.0'.png");
  expect(Asset.Key.make(`${longest}a`)).toBe(`${longest}a`);

  const structure = ["", "/a", "a/", "a//b", "./a", "a/.."];
  // URL delimiters, characters file systems forbid, non-ASCII and controls.
  const characters = ["a b", "a#b", "a?b", "a%20b", "a*b", "a:b", "a\\b", "ü.png", "a\u0000b"];

  for (const value of [...structure, ...characters, 1]) expect(() => decode(value)).toThrow();

  expect(() => decode(`${segment}a`)).toThrow("at most 255 characters");

  expect(() => decode(`${longest}a`)).toThrow(
    "keys with the prefix avatar/ must fit in 1024 characters",
  );
  expect(() => Schema.decodeSync(Asset.Key)(`${longest}/${"a".repeat(7)}`)).toThrow(
    "keys must fit in 1024 characters",
  );
});

it.effect("rejects keys that bypass the type check before reaching the store", () =>
  Effect.gen(function* () {
    const store = yield* Public;

    yield* store.put({ key: "a", contentType: "image/png", body: bytes("a") });

    // SAFETY: deliberately bypasses the brand the runtime check backs up.
    const escaping = "../a" as Asset.Key;

    const operations: ReadonlyArray<
      Effect.Effect<
        void,
        | Asset.ReadError
        | Asset.TooLarge
        | Asset.UnsupportedContentType
        | Asset.ContentLengthMismatch,
        Public
      >
    > = [
      Effect.asVoid(Avatar.put(escaping, bytes("b"), { contentType: "image/png" })),
      Effect.asVoid(Avatar.get(escaping)),
      Effect.asVoid(Avatar.head(escaping)),
      Avatar.delete(escaping),
    ];

    for (const operation of operations) {
      const error = yield* Effect.flip(operation);

      expect(error).toBeInstanceOf(Asset.InvalidKey);
      expect(error instanceof Asset.InvalidKey && error.reason).toContain("`..`");
    }

    expect(Option.isSome(yield* store.head("a"))).toBe(true);
  }).pipe(Effect.provide(Buckets)),
);

it.effect("stores domain keys through their schema", () =>
  Effect.gen(function* () {
    const InvoiceId = Schema.String.pipe(Schema.brand("InvoiceId"));

    const InvoicePage = Asset.make("invoice-page", {
      bucket: Private,
      key: Schema.TemplateLiteralParser([InvoiceId, "/page-", Schema.Int]),
      contentTypes: ["application/pdf"],
      maxSize: "1 MB",
    });

    const page = yield* Schema.decodeEffect(InvoicePage.Key)("inv_1/page-3");

    expect(page).toEqual(["inv_1", "/page-", 3]);

    yield* InvoicePage.put(page, bytes("%PDF"), { contentType: "application/pdf" });

    const store = yield* Private;

    expect(Option.isSome(yield* store.head("invoice-page/inv_1/page-3"))).toBe(true);

    // The id schema accepts any string, so the stored key is still checked.
    const error = yield* Effect.flip(InvoicePage.head([InvoiceId.make(".."), "/page-", 1]));

    expect(error).toBeInstanceOf(Asset.InvalidKey);
  }).pipe(Effect.provide(Buckets)),
);

it.effect("fails reads of objects stored with a content type it does not accept", () =>
  Effect.gen(function* () {
    const store = yield* Public;

    yield* store.put({
      key: "avatar/a.png",
      contentType: "text/html",
      body: bytes("<p>"),
    });

    const unexpected = new Asset.UnexpectedContentType({
      asset: "avatar",
      key: "avatar/a.png",
      contentType: "text/html",
    });

    expect(yield* Effect.flip(Avatar.head(key("a.png")))).toEqual(unexpected);
    expect(yield* Effect.flip(Avatar.get(key("a.png")))).toEqual(unexpected);
  }).pipe(Effect.provide(Buckets)),
);

it.effect("deletes objects", () =>
  Effect.gen(function* () {
    yield* Avatar.put(key("a.png"), bytes("a"), { contentType: "image/png" });
    yield* Avatar.delete(key("a.png"));

    expect(yield* read("a.png")).toBeNull();
  }).pipe(Effect.provide(Buckets)),
);

// `toThrow(message)` passes when the thrown value is undefined, so compare the message.
const thrown = (define: () => void) => {
  try {
    define();
  } catch (error) {
    return error instanceof Error ? error.message : "a non-Error value";
  }

  return "nothing";
};

// Clients read the tag and fields of the JSON encoding.
const expectEncoded = (
  encoded: Schema.Json,
  tag: string,
  fields: Readonly<Record<string, string>>,
) => {
  expect(encoded).toHaveProperty("_tag", tag);
  expect(encoded).toMatchObject(fields);
  expect(new Set(Object.keys(encoded ?? {}))).toEqual(new Set(["_tag", ...Object.keys(fields)]));
};

test("encodes errors for clients with their tag, fields and HTTP status", () => {
  const json = <S extends Schema.Codec<unknown, unknown>>(schema: S) =>
    Schema.encodeSync(Schema.toCodecJson(schema));

  expectEncoded(
    json(Asset.InvalidKey)(new Asset.InvalidKey({ asset: "a", reason: "too long" })),
    "AssetInvalidKey",
    { asset: "a", reason: "too long" },
  );
  expectEncoded(
    json(Asset.UnsupportedContentType)(
      new Asset.UnsupportedContentType({ asset: "a", contentType: "text/html" }),
    ),
    "AssetUnsupportedContentType",
    { asset: "a", contentType: "text/html" },
  );
  expectEncoded(
    json(Asset.TooLarge)(new Asset.TooLarge({ asset: "a", maxSize: ByteSize.bytes(1000) })),
    "AssetTooLarge",
    { asset: "a", maxSize: "1000" },
  );
  expectEncoded(
    json(Asset.ContentLengthMismatch)(
      new Asset.ContentLengthMismatch({ asset: "a", contentLength: ByteSize.bytes(10) }),
    ),
    "AssetContentLengthMismatch",
    { asset: "a", contentLength: "10" },
  );
  expectEncoded(
    json(Asset.UnexpectedContentType)(
      new Asset.UnexpectedContentType({ asset: "a", key: "a/k", contentType: "text/html" }),
    ),
    "AssetUnexpectedContentType",
    { asset: "a", key: "a/k", contentType: "text/html" },
  );

  const statuses = [
    Asset.InvalidKey,
    Asset.UnsupportedContentType,
    Asset.TooLarge,
    Asset.ContentLengthMismatch,
    Asset.UnexpectedContentType,
  ].map((error) => Schema.resolveAnnotations(error)?.["httpApiStatus"]);

  expect(statuses).toEqual([400, 415, 413, 400, undefined]);
});

test("rejects ids that are not a single key segment, invalid sizes and content types", () => {
  const definition = { bucket: Public, contentTypes: ["image/png"], maxSize: 1 } as const;

  for (const id of ["", ".", "..", "a/b", "a b", "ü"])
    expect(thrown(() => Asset.make(id, definition))).toContain("single key segment");

  for (const maxSize of [-1, 1.5, Number.POSITIVE_INFINITY])
    expect(thrown(() => Asset.make("a", { ...definition, maxSize }))).toContain("not a byte size");

  // These fit MediaType, so only the runtime check rejects them.
  const unnormalized: ReadonlyArray<Asset.MediaType> = ["image/PNG", "image/png; charset=utf-8"];

  for (const contentType of unnormalized)
    expect(thrown(() => Asset.make("a", { ...definition, contentTypes: [contentType] }))).toContain(
      "lowercase without parameters",
    );
});
