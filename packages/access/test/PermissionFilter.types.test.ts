import type { note } from "./notes.ts";

// @effect-diagnostics missingEffectContext:off
import { Effect, type Layer } from "effect";
import { expectTypeOf, it } from "vitest";

import { type Condition, PermissionFilter } from "../src/index.ts";
import {
  CurrentCaller,
  EditNote,
  Publish,
  ViewNoteFilter,
  type ViewNoteFilterLayer,
} from "./notes.ts";

it("requires the filter's Layer wherever its condition is used", () => {
  expectTypeOf(ViewNoteFilter.condition).toEqualTypeOf<
    Effect.Effect<Condition.Condition<typeof note>, never, ViewNoteFilter>
  >();
  expectTypeOf<Layer.Success<typeof ViewNoteFilterLayer>>().toEqualTypeOf<ViewNoteFilter>();
});

it("rejects conditions on fields the target lacks or with values of another type", () => {
  // @ts-expect-error
  ViewNoteFilter.toLayer((where) => where.eq("hidden", "no"));
  // @ts-expect-error
  ViewNoteFilter.toLayer((where) => where.eq("title", "Plans"));
});

it("rejects policies reading services the permission does not declare", () => {
  // @ts-expect-error
  ViewNoteFilter.toLayer((where) => Effect.as(CurrentCaller, where.all()));
});

it("rejects filters for permissions without a target", () => {
  // @ts-expect-error
  expectTypeOf(PermissionFilter.Service<unknown>()).toBeCallableWith(Publish);
});

it("keeps refusals of required permissions out of conditions", () => {
  class EditNoteFilter extends PermissionFilter.Service<EditNoteFilter>()(EditNote) {}

  expectTypeOf(EditNoteFilter.condition).toEqualTypeOf<
    Effect.Effect<Condition.Condition<typeof note>, never, EditNoteFilter | CurrentCaller>
  >();
});
