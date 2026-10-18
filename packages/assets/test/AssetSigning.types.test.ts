// @effect-diagnostics missingEffectContext:off
import { ByteSize, type Effect } from "effect";
import { expectTypeOf, it } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as AssetDelivery from "../src/AssetDelivery.ts";
import * as AssetSigning from "../src/AssetSigning.ts";

class Public extends AssetBucket.Service<Public>()("public") {}

class Private extends AssetBucket.Service<Private>()("private") {}

const Avatar = Asset.make("avatar", { bucket: Public, contentTypes: ["image/png"], maxSize: 1 });

const key = Asset.Key.make("k");

it("requires only the capability each operation uses, of the asset's bucket", () => {
  const upload = { contentType: "image/png" as const, size: ByteSize.bytes(1) };

  expectTypeOf<Effect.Services<ReturnType<typeof Avatar.head>>>().toEqualTypeOf<Public>();
  expectTypeOf(AssetSigning.presignPut(Avatar, key, upload)).toExtend<
    Effect.Effect<unknown, unknown, AssetSigning.SigningOf<Public>>
  >();
  expectTypeOf(AssetSigning.presignPut(Avatar, key, upload)).not.toExtend<
    Effect.Effect<unknown, unknown, AssetSigning.SigningOf<Private>>
  >();
  expectTypeOf(AssetDelivery.url(Avatar, key)).toEqualTypeOf<
    Effect.Effect<string, Asset.InvalidKey, AssetDelivery.DeliveryOf<Public>>
  >();
  expectTypeOf(AssetSigning.confirm(Avatar, key, upload)).toExtend<
    Effect.Effect<unknown, unknown, Public>
  >();
});

it("signs only the asset's content types", () => {
  const html = { contentType: "text/html", size: ByteSize.bytes(1) } as const;
  const presign = AssetSigning.presignPut<"image/png", Asset.Key, Public>;

  expectTypeOf(presign).toBeCallableWith(
    Avatar,
    key,
    // @ts-expect-error
    html,
  );
});
