import { Schema } from "effect";
import { expect, it } from "vitest";

import * as AssetBucket from "../src/AssetBucket.ts";

it("names buckets by their id, apart from their service key", () => {
  class Public extends AssetBucket.Service<Public>()("public") {}

  expect(Public.id).toBe("public");
  expect(Public.key).toBe("@kutur-kit/assets/AssetBucket/public");
});

it("encodes store failures with the operation, bucket and key", () => {
  const codec = Schema.toCodecJson(AssetBucket.AssetBucketError);

  const failure = (operation: AssetBucket.AssetBucketError["operation"]) =>
    new AssetBucket.AssetBucketError({
      operation,
      bucket: "public",
      key: "avatar/a.png",
      cause: new Error("connection reset"),
    });

  const encoded = Schema.encodeSync(codec)(failure("head"));

  expect(encoded).toHaveProperty("_tag", "AssetBucketError");
  expect(encoded).toMatchObject({
    operation: "head",
    bucket: "public",
    key: "avatar/a.png",
    cause: { name: "Error", message: "connection reset" },
  });

  for (const operation of ["put", "get", "head", "delete"] as const)
    expect(Schema.decodeSync(codec)(Schema.encodeSync(codec)(failure(operation)))).toHaveProperty(
      "operation",
      operation,
    );

  expect(() =>
    Schema.decodeSync(codec)(Object.assign({}, encoded, { operation: "list" })),
  ).toThrow();
});
