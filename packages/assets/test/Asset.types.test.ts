// @effect-diagnostics missingEffectContext:off
import { Effect, type Layer, type Option, Schema, Stream } from "effect";
import { expectTypeOf, it } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as Memory from "../src/memory.ts";

class Public extends AssetBucket.Service<Public>()("public") {}

const Avatar = Asset.make("avatar", {
  bucket: Public,
  contentTypes: ["image/png", "image/jpeg"],
  maxSize: 1,
});

type Type = "image/png" | "image/jpeg";

const k = Asset.Key.make("k");

it("keeps the asset id and adds the body's error to put", () => {
  class BodyError {
    readonly _tag = "BodyError";
  }

  expectTypeOf(Avatar.id).toEqualTypeOf<"avatar">();
  expectTypeOf(
    Avatar.put(k, Stream.fail(new BodyError()), { contentType: "image/png" }),
  ).toEqualTypeOf<
    Effect.Effect<
      Asset.Info<Type>,
      | Asset.InvalidKey
      | Asset.UnsupportedContentType
      | Asset.TooLarge
      | Asset.ContentLengthMismatch
      | AssetBucket.AssetBucketError
      | BodyError,
      Public
    >
  >();
});

it("accepts only the declared content types and returns them from reads", () => {
  const body = Stream.empty;

  const [jpeg, html, parameters] = [
    { contentType: "image/jpeg" },
    { contentType: "text/html" },
    { contentType: "image/png; q=1" },
  ] as const;

  expectTypeOf(Avatar.put).toBeCallableWith(k, body, jpeg);
  // @ts-expect-error
  expectTypeOf(Avatar.put).toBeCallableWith(k, body, html);
  // @ts-expect-error
  expectTypeOf(Avatar.put).toBeCallableWith(k, body, parameters);

  expectTypeOf(Avatar.head(k)).toEqualTypeOf<
    Effect.Effect<Option.Option<Asset.Info<Type>>, Asset.ReadError, Public>
  >();
  expectTypeOf<Effect.Success<ReturnType<typeof Avatar.get>>>().toEqualTypeOf<
    Option.Option<Asset.StoredObject<Type>>
  >();
  expectTypeOf(Schema.decodeUnknownSync(Avatar.ContentType)).returns.toEqualTypeOf<Type>();
});

it("takes keys of the key schema's type", () => {
  const UserId = Schema.String.pipe(Schema.brand("UserId"));

  const Profile = Asset.make("profile", {
    bucket: Public,
    key: UserId,
    contentTypes: ["image/png"],
    maxSize: 1,
  });

  expectTypeOf(Avatar.Key).toEqualTypeOf<Asset.KeySchema<Asset.Key>>();
  expectTypeOf(Profile.Key).toEqualTypeOf<Asset.KeySchema<typeof UserId.Type>>();
  expectTypeOf(Profile.delete).toBeCallableWith(UserId.make("ada"));
  // @ts-expect-error
  expectTypeOf(Profile.delete).toBeCallableWith("ada");
  // @ts-expect-error
  expectTypeOf(Avatar.delete).toBeCallableWith("a.png");
});

it("requires the asset's bucket until a layer backs it", () => {
  class Private extends AssetBucket.Service<Private>()("private") {}

  const Scan = Asset.make("scan", { bucket: Private, contentTypes: ["image/png"], maxSize: 1 });

  const both = Effect.andThen(Avatar.delete(k), Scan.delete(k));

  type Errors = Asset.InvalidKey | AssetBucket.AssetBucketError;

  expectTypeOf(both).toEqualTypeOf<Effect.Effect<void, Errors, Public | Private>>();
  expectTypeOf(Effect.provide(both, Memory.layer(Public))).toEqualTypeOf<
    Effect.Effect<void, Errors, Private>
  >();
  expectTypeOf(Memory.toLayer([Avatar, Scan])).toEqualTypeOf<Layer.Layer<Public | Private>>();
});

it("checks literal byte sizes", () => {
  type MaxSize = Asset.Definition["maxSize"];

  expectTypeOf<"5 MiB">().toExtend<MaxSize>();
  expectTypeOf<"500kB">().toExtend<MaxSize>();
  expectTypeOf<"5 MIB">().not.toExtend<MaxSize>();
  expectTypeOf<"1.5 MB">().not.toExtend<MaxSize>();
  expectTypeOf<"-1 kB">().not.toExtend<MaxSize>();
});

// Defined in functions that never run: `make` also throws for these at runtime.
it("rejects ids that are not one key segment", () => {
  const definition = { bucket: Public, contentTypes: ["image/png"], maxSize: 1 } as const;

  expectTypeOf(() => {
    Asset.make("avatar", definition);
    // @ts-expect-error
    Asset.make("a/b", definition);
    // @ts-expect-error
    Asset.make("..", definition);
    // @ts-expect-error
    Asset.make("", definition);
  }).toBeFunction();
});

it("rejects content types that are not lowercase or have parameters", () => {
  const definition = { bucket: Public, maxSize: 1 } as const;

  expectTypeOf(() => {
    Asset.make("a", { ...definition, contentTypes: ["image/svg+xml", "application/vnd.api+json"] });
    // @ts-expect-error
    Asset.make("a", { ...definition, contentTypes: ["image/PNG"] });
    // @ts-expect-error
    Asset.make("a", { ...definition, contentTypes: ["image/png", "text/plain; charset=utf-8"] });
  }).toBeFunction();
});

it("requires at least one media type", () => {
  // @ts-expect-error
  Asset.make("a", { bucket: Public, contentTypes: [], maxSize: 1 });
  // @ts-expect-error
  Asset.make("a", { bucket: Public, contentTypes: ["png"], maxSize: 1 });
  // @ts-expect-error
  Asset.make("a", { bucket: Public, contentTypes: ["imag/png"], maxSize: 1 });
});
