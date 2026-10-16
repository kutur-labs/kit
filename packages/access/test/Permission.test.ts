import { it } from "@effect/vitest";
import { Effect, Layer, Ref, Schema, Tracer } from "effect";
import { expect, it as test } from "vitest";

import { Decision, Permission } from "../src/index.ts";
import { as, EditNote, live, note, Publish, ViewNote, ViewNoteLayer } from "./notes.ts";

const traced = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const spans: Array<Tracer.NativeSpan> = [];

    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        spans.push(span);

        return span;
      },
    });

    yield* effect.pipe(Effect.withTracer(tracer), Effect.exit);

    return new Map(spans.map((span) => [span.name, Object.fromEntries(span.attributes)]));
  });

const hidden = { ...note, hidden: true };

const viewOnly = Permission.restrictTo([ViewNote]);

const editor = Permission.restrictTo([ViewNote, EditNote]);

it.effect("runs the guarded effect only when the policy allows", () =>
  Effect.gen(function* () {
    const edits = yield* Ref.make(0);

    const edit = (caller: string) =>
      EditNote.require(note).pipe(
        Effect.andThen(Ref.update(edits, (count) => count + 1)),
        as(caller),
      );

    yield* edit("ada");
    const refused = yield* edit("bo").pipe(Effect.flip);

    expect(refused).toEqual(new Decision.Denied({ permission: "notes.edit" }));
    expect(yield* Ref.get(edits)).toBe(1);
    expect(yield* EditNote.check(note).pipe(as("bo"))).toEqual(Decision.deny("Authors only"));
  }).pipe(Effect.provide(live)),
);

it.effect("reports a required permission's refusal before the dependent policy decides", () =>
  Effect.gen(function* () {
    const refused = yield* EditNote.require(hidden).pipe(as("ada"), Effect.flip);

    expect(refused).toEqual(new Decision.Denied({ permission: "notes.view" }));
  }).pipe(Effect.provide(live)),
);

it.effect("lets callers handle one permission's refusals and keep the others", () =>
  Effect.gen(function* () {
    const edit = (target: typeof note) =>
      EditNote.require(target).pipe(
        Effect.catchIf(Schema.is(ViewNote.Denied), () => Effect.succeed("hidden")),
      );

    expect(yield* edit(hidden).pipe(as("ada"))).toBe("hidden");
    expect(yield* edit(note).pipe(as("bo"), Effect.flip)).toEqual(
      new Decision.Denied({ permission: "notes.edit" }),
    );
  }).pipe(Effect.provide(live)),
);

it.effect("checks permissions that declare no caller without one in context", () =>
  Effect.gen(function* () {
    expect(yield* ViewNote.check(note)).toEqual(Decision.allow());
  }).pipe(Effect.provide(live)),
);

it.effect("checks permissions without a target against context alone", () =>
  Effect.gen(function* () {
    expect(yield* Publish.check().pipe(as("ada"))).toEqual(Decision.allow());
  }).pipe(Effect.provide(live)),
);

it.effect("refuses permissions outside the caller's restriction before policies run", () =>
  Effect.gen(function* () {
    expect(yield* EditNote.check(note).pipe(editor, as("ada"))).toEqual(Decision.allow());
    expect(yield* EditNote.check(note).pipe(viewOnly, as("ada"))).toEqual(Decision.restricted());
    expect(yield* Publish.check().pipe(editor, as("ada"))).toEqual(Decision.restricted());
    expect(yield* EditNote.check(note).pipe(editor, as("bo"))).toEqual(
      Decision.deny("Authors only"),
    );
  }).pipe(Effect.provide(live)),
);

it.effect("narrows nested restrictions and applies them to required permissions", () =>
  Effect.gen(function* () {
    expect(yield* EditNote.check(note).pipe(editor, viewOnly, as("ada"))).toEqual(
      Decision.restricted(),
    );
    expect(yield* ViewNote.check(note).pipe(editor, viewOnly)).toEqual(Decision.allow());

    const refused = yield* EditNote.require(note).pipe(
      Permission.restrictTo([EditNote]),
      as("ada"),
      Effect.flip,
    );

    expect(refused).toEqual(new Decision.Denied({ permission: "notes.view" }));
  }).pipe(Effect.provide(live)),
);

it.effect("restricts callers to stored ids, dropping ids of removed permissions", () =>
  Effect.gen(function* () {
    const Scopes = Permission.set([ViewNote, EditNote]);
    const scopes = yield* Schema.decodeEffect(Scopes.schema)(["notes.view", "notes.delete"]);

    expect(scopes).toEqual(["notes.view"]);
    expect(yield* Schema.encodeEffect(Scopes.schema)(scopes)).toEqual(["notes.view"]);
    expect(yield* EditNote.check(note).pipe(Scopes.restrictTo(scopes), as("ada"))).toEqual(
      Decision.restricted(),
    );
    expect(yield* ViewNote.check(note).pipe(Scopes.restrictTo(scopes))).toEqual(Decision.allow());
  }).pipe(Effect.provide(live)),
);

test("rejects sets of permissions sharing an id", () => {
  class Copy extends Permission.Service<Copy>()("test/Copy", { id: "notes.view" }) {}

  expect(() => Permission.set([ViewNote, Copy])).toThrow(
    "Permission id notes.view is used by more than one permission",
  );
});

it.effect("answers checks refused by a required permission instead of failing", () =>
  Effect.gen(function* () {
    const spans = yield* traced(EditNote.check(hidden).pipe(as("ada")));

    expect(yield* EditNote.check(hidden).pipe(as("ada"))).toEqual(Decision.unmet("notes.view"));
    expect(spans.get("test/EditNote.check")).toMatchObject({
      "access.decision": "Deny",
      "access.denied_by": "requirement",
      "access.requirement": "notes.view",
    });
  }).pipe(Effect.provide(live)),
);

it.effect("records which permission denied, what denied it and the policy's reason on spans", () =>
  Effect.gen(function* () {
    const restricted = yield* traced(EditNote.require(note).pipe(viewOnly, as("ada")));
    const refused = yield* traced(EditNote.check(note).pipe(as("bo")));
    const required = yield* traced(EditNote.require(hidden).pipe(as("ada")));

    expect(restricted.get("test/EditNote.require")).toMatchObject({
      "access.permission": "notes.edit",
      "access.decision": "Deny",
      "access.denied_by": "restriction",
    });
    expect(restricted.get("test/EditNote.require")).not.toHaveProperty("access.reason");
    expect(refused.get("test/EditNote.check")).toMatchObject({
      "access.decision": "Deny",
      "access.denied_by": "policy",
      "access.reason": "Authors only",
    });
    expect(refused.get("test/EditNote.check")).not.toHaveProperty("access.requirement");
    expect(required.get("test/ViewNote.require")).toMatchObject({
      "access.permission": "notes.view",
      "access.denied_by": "policy",
      "access.reason": "Hidden",
    });
  }).pipe(Effect.provide(live)),
);

it.effect("passes every decision to taps and keeps the service's refusals and spans", () =>
  Effect.gen(function* () {
    const decided: Array<Permission.Decided<typeof ViewNote.definition>> = [];

    const tapped = Layer.effect(
      ViewNote,
      Effect.map(
        ViewNote,
        Permission.tap((event) =>
          Effect.sync(() => {
            decided.push(event);
          }),
        ),
      ),
    ).pipe(Layer.provide(ViewNoteLayer));

    const spans = yield* traced(
      Effect.gen(function* () {
        yield* ViewNote.check(note);
        yield* ViewNote.check(note).pipe(Permission.restrictTo([EditNote]));
        yield* ViewNote.require(hidden);
      }).pipe(Effect.provide(tapped)),
    );

    expect(decided).toEqual([
      {
        permission: "notes.view",
        via: "check",
        target: [note],
        decision: Decision.allow(),
      },
      {
        permission: "notes.view",
        via: "check",
        target: [note],
        decision: Decision.restricted(),
      },
      {
        permission: "notes.view",
        via: "require",
        target: [hidden],
        decision: Decision.deny("Hidden"),
      },
    ]);
    expect(spans.get("test/ViewNote.require")).toMatchObject({ "access.reason": "Hidden" });
    expect(yield* ViewNote.require(hidden).pipe(Effect.provide(tapped), Effect.flip)).toEqual(
      new Decision.Denied({ permission: "notes.view" }),
    );
  }),
);

test("taps only services built by toLayer", () => {
  const custom = ViewNote.of({
    check: () => Effect.succeed(Decision.allow()),
    require: () => Effect.void,
  });

  expect(() => Permission.tap(() => Effect.void)(custom)).toThrow(
    "Permission.tap needs a permission service built by toLayer",
  );
});

// Restrictions hold service keys, so an id clash outside a set cannot widen them.
it.effect("restricts permissions sharing an id with an allowed one", () =>
  Effect.gen(function* () {
    class Archive extends Permission.Service<Archive>()("test/Archive", { id: "notes.view" }) {}

    const decision = yield* Archive.check().pipe(
      Permission.restrictTo([ViewNote]),
      Effect.provide(Archive.toLayer(() => Decision.allow())),
    );

    expect(decision).toEqual(Decision.restricted());
  }),
);
