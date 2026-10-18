import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";

import { permissionDemo } from "./permission";

it.effect("checks without changing or auditing the note", () =>
  Effect.gen(function* () {
    for (const [userId, result] of [
      ["ada", "Allow"],
      ["bo", "Deny"],
    ] as const) {
      expect(yield* permissionDemo({ userId, mode: "check", restricted: false })).toEqual({
        result,
        body: "Original note",
        audit: [],
      });
    }
  }),
);

it.effect("saves only for the owner and records the actor without note content", () =>
  Effect.gen(function* () {
    const result = yield* permissionDemo({ userId: "ada", mode: "require", restricted: false });
    expect(result).toEqual({
      result: "Saved",
      body: "Updated note",
      audit: [
        {
          action: "notes.edit",
          outcome: "Allow",
          target: { id: "note-1" },
          actor: { id: "ada", kind: "user" },
        },
      ],
    });
  }),
);

it.effect("keeps a refused edit unchanged and distinguishes policy from scope refusal", () =>
  Effect.gen(function* () {
    for (const [userId, restricted, by] of [
      ["bo", false, "policy"],
      ["ada", true, "restriction"],
    ] as const) {
      const result = yield* permissionDemo({ userId, mode: "require", restricted });
      expect(result.result).toBe("AccessDenied");
      expect(result.body).toBe("Original note");
      expect(result.audit).toHaveLength(1);
      expect(result.audit[0]).toMatchObject({
        outcome: "Deny",
        details: { deniedBy: by },
        actor: { id: userId },
      });
    }
  }),
);
