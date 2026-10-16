import { Schema } from "effect";
import { expect, it } from "vitest";

import { Decision } from "../src/index.ts";

it("encodes refusals for clients with the permission and a 403 status, without reasons", () => {
  const denied = new Decision.Denied({ permission: "notes.edit" });

  const encoded = Schema.encodeSync(Decision.Denied)(denied);

  expect(new Set(Object.keys(encoded))).toEqual(new Set(["_tag", "permission"]));
  expect(encoded).toHaveProperty("_tag", "AccessDenied");
  expect(encoded).toHaveProperty("permission", "notes.edit");
  expect(Schema.resolveAnnotations(Decision.Denied)?.["httpApiStatus"]).toBe(403);
});

it("marks policy denials apart from restrictions and unmet requirements", () => {
  expect(Decision.deny()).toMatchObject({ by: "policy" });
  expect(Decision.deny()).not.toHaveProperty("reason");
  expect(Decision.deny("Hidden")).toMatchObject({ by: "policy", reason: "Hidden" });
  expect(Decision.restricted()).toMatchObject({ by: "restriction" });
  expect(Decision.unmet("notes.view")).toMatchObject({
    by: "requirement",
    requirement: "notes.view",
  });
});
