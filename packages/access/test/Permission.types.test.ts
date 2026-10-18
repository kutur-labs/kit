// @effect-diagnostics missingEffectContext:off missingEffectError:off
import { Context, Effect, type Layer, Schema } from "effect";
import { expectTypeOf, it } from "vitest";

import { Decision, Permission } from "../src/index.ts";
import { CurrentCaller, EditNote, live, note, Publish, ViewNote } from "./notes.ts";

type Refused = Decision.DeniedBy<"notes.edit"> | Decision.DeniedBy<"notes.view">;

class Authors extends Context.Service<Authors, { readonly isAuthor: (id: string) => boolean }>()(
  "test/Authors",
) {}

it("adds the permission and its declared callers to the requirements of checks", () => {
  expectTypeOf(EditNote.require(note)).toEqualTypeOf<
    Effect.Effect<void, Refused, EditNote | CurrentCaller>
  >();
  expectTypeOf(ViewNote.check(note)).toEqualTypeOf<
    Effect.Effect<Decision.Decision, never, ViewNote>
  >();
});

it("keeps the caller required until authentication provides it", () => {
  const handler = EditNote.require(note).pipe(Effect.provide(live));

  expectTypeOf(handler).toEqualTypeOf<Effect.Effect<void, Refused, CurrentCaller>>();
  expectTypeOf(handler.pipe(Effect.provideService(CurrentCaller, { id: "ada" }))).toEqualTypeOf<
    Effect.Effect<void, Refused>
  >();
});

it("types refusals by permission, so handling one leaves the others", () => {
  class Hidden extends Schema.TaggedError<Hidden, { readonly brand: unique symbol }>()(
    "Hidden",
    {},
  ) {}

  const edit = EditNote.require(note).pipe(
    Effect.catchIf(Schema.is(ViewNote.Denied), () => Effect.fail(new Hidden())),
  );

  expectTypeOf(edit).toEqualTypeOf<
    Effect.Effect<void, Decision.DeniedBy<"notes.edit"> | Hidden, EditNote | CurrentCaller>
  >();
});

it("rejects policies reading services the permission does not declare", () => {
  // @ts-expect-error
  ViewNote.toLayer(() => Effect.map(CurrentCaller, () => Decision.allow()));
});

it("reports services acquired by the policy's Layer, not by its checks", () => {
  const layer = ViewNote.toLayer(
    Effect.map(
      Authors,
      (authors) => (target: typeof note) =>
        authors.isAuthor(target.authorId) ? Decision.allow() : Decision.deny(),
    ),
  );

  expectTypeOf<Layer.Success<typeof layer>>().toEqualTypeOf<ViewNote>();
  expectTypeOf<Layer.Services<typeof layer>>().toEqualTypeOf<Authors>();
});

it("takes the declared target, or no arguments without one", () => {
  expectTypeOf(ViewNote.check).toBeCallableWith(note);
  // @ts-expect-error
  expectTypeOf(ViewNote.check).toBeCallableWith({ id: "n1" });
  expectTypeOf(Publish.check).toBeCallableWith();
  // @ts-expect-error
  expectTypeOf(Publish.check).toBeCallableWith(note);
});

it("types stored ids as the ids of the set's permissions", () => {
  const Scopes = Permission.set([ViewNote, EditNote]);

  expectTypeOf(EditNote.id).toEqualTypeOf<"notes.edit">();
  expectTypeOf(Publish.id).toEqualTypeOf<"test/Publish">();
  expectTypeOf<typeof Scopes.schema.Type>().toEqualTypeOf<
    ReadonlyArray<"notes.view" | "notes.edit">
  >();
  expectTypeOf(Scopes.restrictTo).toBeCallableWith(["notes.edit"]);
  // @ts-expect-error
  expectTypeOf(Scopes.restrictTo).toBeCallableWith(["test/Publish"]);
});

it("rejects policies failing with errors the permission does not declare", () => {
  class LookupFailed extends Schema.TaggedError<LookupFailed, { readonly brand: unique symbol }>()(
    "LookupFailed",
    {},
  ) {}

  // @ts-expect-error
  ViewNote.toLayer(() => Effect.fail(new LookupFailed()));
});

it("keeps refusals of required permissions out of checks, which answer them", () => {
  expectTypeOf(EditNote.check(note)).toEqualTypeOf<
    Effect.Effect<Decision.Decision, never, EditNote | CurrentCaller>
  >();
});
