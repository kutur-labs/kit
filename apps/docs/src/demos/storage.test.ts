import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";

import { storageDemo } from "./storage";

it.effect("writes and reads UTF-8 text then deletes the object", () =>
  Effect.gen(function* () {
    expect(yield* storageDemo("hello 🌍")).toEqual({
      result: "Saved",
      attemptedBytes: 10,
      storedKey: "note/welcome.txt",
      content: "hello 🌍",
      existsAfterDelete: false,
    });
  }),
);

it.effect(
  "accepts the byte limit and preserves the previous object after an oversized overwrite",
  () =>
    Effect.gen(function* () {
      expect((yield* storageDemo("é".repeat(32))).result).toBe("Saved");
      expect(yield* storageDemo("é".repeat(33))).toEqual({
        result: "AssetTooLarge",
        attemptedBytes: 66,
        storedKey: "note/welcome.txt",
        content: "Original note",
        existsAfterDelete: false,
      });
    }),
);
