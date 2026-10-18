import { it } from "@effect/vitest";
import { ByteSize, DateTime, Duration, Effect, Layer, Schema, Stream } from "effect";
import { expect, it as test } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as AssetSigning from "../src/AssetSigning.ts";
import * as Memory from "../src/memory.ts";

class Public extends AssetBucket.Service<Public>()("public") {}

const Avatar = Asset.make("avatar", {
  bucket: Public,
  contentTypes: ["image/png", "image/jpeg"],
  maxSize: 4,
});

const key = Asset.Key.make("ada");

const png = (size: number) => ({ contentType: "image/png" as const, size: ByteSize.bytes(size) });

/** A signer that records what it was asked to sign. */
const recording = () => {
  const signed: Array<AssetSigning.SignPutInput | AssetSigning.SignGetInput> = [];

  const sign = (method: "PUT" | "GET") => (input: (typeof signed)[number]) =>
    Effect.sync(() => {
      signed.push(input);

      return { method, url: "/signed", headers: {}, expiresAt: DateTime.makeUnsafe(0) };
    });

  return {
    signed,
    layer: Layer.succeed(AssetSigning.of(Public), { signPut: sign("PUT"), signGet: sign("GET") }),
  };
};

test("decodes a declared upload with a type the asset accepts and a size in bytes", () => {
  const decode = Schema.decodeUnknownSync(AssetSigning.Upload(Avatar));

  expect(decode({ contentType: " IMAGE/PNG; q=1", size: 4 })).toEqual(png(4));

  for (const upload of [
    { contentType: "text/html", size: 4 },
    { contentType: "image/png", size: -1 },
    { contentType: "image/png", size: 1.5 },
    { contentType: "image/png" },
  ])
    expect(() => decode(upload)).toThrow();
});

it.effect("signs uploads for the stored key, type and size, for 15 minutes by default", () =>
  Effect.gen(function* () {
    const { signed, layer } = recording();

    yield* AssetSigning.presignPut(Avatar, key, png(4)).pipe(Effect.provide(layer));
    yield* AssetSigning.presignGet(Avatar, key, { expiresIn: "1 hour" }).pipe(
      Effect.provide(layer),
    );

    expect(signed).toEqual([
      {
        key: "avatar/ada",
        contentType: "image/png",
        contentLength: ByteSize.bytes(4),
        cacheControl: "no-cache",
        expiresIn: Duration.minutes(15),
      },
      { key: "avatar/ada", expiresIn: Duration.hours(1) },
    ]);
  }),
);

it.effect("refuses to sign uploads the asset would not accept", () =>
  Effect.gen(function* () {
    const { signed, layer } = recording();

    const errors = yield* Effect.all([
      Effect.flip(AssetSigning.presignPut(Avatar, key, png(5))),
      // SAFETY: deliberately bypasses the type check the runtime check backs up.
      Effect.flip(
        AssetSigning.presignPut(Avatar, key, {
          ...png(1),
          contentType: "text/html" as "image/png",
        }),
      ),
      // SAFETY: deliberately bypasses the brand the runtime check backs up.
      Effect.flip(AssetSigning.presignPut(Avatar, "../ada" as Asset.Key, png(1))),
    ]).pipe(Effect.provide(layer));

    expect(errors.map((error) => error._tag)).toEqual([
      "AssetTooLarge",
      "AssetUnsupportedContentType",
      "AssetInvalidKey",
    ]);
    expect(signed).toEqual([]);
  }),
);

it.effect("confirms an upload only when it arrived as declared", () =>
  Effect.gen(function* () {
    const reason = (upload: AssetSigning.Upload<"image/png" | "image/jpeg">) =>
      Effect.map(Effect.flip(AssetSigning.confirm(Avatar, key, upload)), (error) =>
        error instanceof AssetSigning.UploadNotConfirmed ? error.reason : error._tag,
      );

    expect(yield* reason(png(4))).toBe("missing");

    yield* Avatar.put(key, Stream.make(new Uint8Array(4)), { contentType: "image/png" });

    expect(yield* reason(png(3))).toBe("size");
    expect(yield* reason({ ...png(4), contentType: "image/jpeg" })).toBe("contentType");
    expect(yield* AssetSigning.confirm(Avatar, key, png(4))).toEqual(png(4));
  }).pipe(Effect.provide(Memory.layer(Public))),
);

test("encodes unconfirmed uploads as conflicts", () => {
  expect(Schema.resolveAnnotations(AssetSigning.UploadNotConfirmed)?.["httpApiStatus"]).toBe(409);
});
