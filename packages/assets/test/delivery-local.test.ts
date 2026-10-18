// By module: the package index also loads modules needing optional peers, such as redis.
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/http";
import { expect } from "vitest";

import * as Asset from "../src/Asset.ts";
import * as AssetBucket from "../src/AssetBucket.ts";
import * as AssetDelivery from "../src/AssetDelivery.ts";
import * as DeliveryLocal from "../src/delivery/local.ts";
import * as Memory from "../src/memory.ts";

class Public extends AssetBucket.Service<Public>()("public") {}

const Avatar = Asset.make("avatar", { bucket: Public, contentTypes: ["image/png"], maxSize: 4 });

const options = { baseUrl: "/cdn/public" };

const server = HttpRouter.serve(DeliveryLocal.routes(Public, options), {
  disableLogger: true,
}).pipe(
  Layer.provideMerge(AssetDelivery.layer(Public, options)),
  Layer.provideMerge(Memory.layer(Public)),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

const key = Asset.Key.make("users/ada.png");

it.effect("serves public URLs without a signature, marked so browsers render them inertly", () =>
  Effect.gen(function* () {
    yield* Avatar.put(key, Stream.make(new Uint8Array([1, 2])), { contentType: "image/png" });

    const url = yield* AssetDelivery.url(Avatar, key);

    expect(url).toBe("/cdn/public/avatar/users/ada.png");

    const response = yield* HttpClient.execute(HttpClientRequest.get(url));

    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({
      "content-type": "image/png",
      "content-length": "2",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    });
    expect(new Uint8Array(yield* response.arrayBuffer)).toEqual(new Uint8Array([1, 2]));
  }).pipe(Effect.provide(server)),
);

it.effect("answers 404 for missing objects and refuses uploads", () =>
  Effect.gen(function* () {
    const url = yield* AssetDelivery.url(Avatar, key);

    const missing = yield* HttpClient.execute(HttpClientRequest.get(url));

    const upload = yield* HttpClient.execute(
      HttpClientRequest.put(url).pipe(
        HttpClientRequest.bodyUint8Array(new Uint8Array([1]), "image/png"),
      ),
    );

    expect(missing.status).toBe(404);
    expect(upload.status).toBe(404);
  }).pipe(Effect.provide(server)),
);
