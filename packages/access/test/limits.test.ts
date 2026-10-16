import { it } from "@effect/vitest";
import { TestAuditLog } from "@kutur-kit/audit/testing";
import { Cause, Effect, Exit, Fiber, Layer, Ref, Schema } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";

import * as PermissionAudit from "../src/audit.ts";
import { Condition, Decision, Permission } from "../src/index.ts";
import { as, EditNote, live, note, ViewNote, ViewNoteFilter } from "./notes.ts";

// Pushes the core past what applications usually need, to find its limits.

const depth = 100;

/** One identity for every step, as a loop cannot declare a class per step. */
interface Step {
  readonly step: unique symbol;
}

const steps = Array.from({ length: depth }, (_, index) =>
  Permission.Service<Step>()(`limits/Step${index}`, {
    id: `steps.${index}`,
    target: Schema.Finite,
    error: Decision.Denied,
  }),
);

const step = (index: number) => {
  const found = steps[index];

  if (found === undefined) throw new Error(`No step ${index}`);

  return found;
};

const allowFrom = (index: number) => (target: number) =>
  target >= index ? Decision.allow() : Decision.deny(`Below ${index}`);

// Step i allows targets of at least i, after its previous step allows them.
const stepLayer = (index: number): Layer.Layer<Step> =>
  index === 0
    ? step(0).toLayer(allowFrom(0))
    : step(index)
        .toLayer(
          Effect.gen(function* () {
            const previous = yield* step(index - 1);

            return Effect.fn(function* (target: number) {
              yield* previous.require(target);

              return allowFrom(index)(target);
            });
          }),
        )
        .pipe(Layer.provide(stepLayer(index - 1)));

const top = step(depth - 1);

it.effect(`resolves a chain of ${depth} permissions each requiring the previous`, () =>
  Effect.gen(function* () {
    expect(yield* top.check(depth)).toEqual(Decision.allow());
    expect(yield* top.require(50).pipe(Effect.flip)).toEqual(
      new Decision.Denied({ permission: "steps.51" }),
    );
    expect(
      yield* top
        .require(depth)
        .pipe(Permission.restrictTo(steps.filter((_, index) => index !== 10)), Effect.flip),
    ).toEqual(new Decision.Denied({ permission: "steps.10" }));
  }).pipe(Effect.provide(stepLayer(depth - 1))),
);

it.effect("keeps each fiber's caller and restriction under 2,000 concurrent checks", () =>
  Effect.gen(function* () {
    const attempts = Array.from({ length: 2_000 }, (_, index) => ({
      caller: index % 3 === 0 ? "ada" : `user-${index}`,
      restricted: index % 5 === 0,
    }));

    const decisions = yield* Effect.forEach(
      attempts,
      ({ caller, restricted }) => {
        const check = Effect.andThen(Effect.yieldNow, EditNote.check(note));

        return (restricted ? check.pipe(Permission.restrictTo([ViewNote])) : check).pipe(
          as(caller),
        );
      },
      { concurrency: "unbounded" },
    );

    expect(decisions).toEqual(
      attempts.map(({ caller, restricted }) =>
        restricted
          ? Decision.restricted()
          : caller === "ada"
            ? Decision.allow()
            : Decision.deny("Authors only"),
      ),
    );
  }).pipe(Effect.provide(live)),
);

it.effect("narrows restrictions nested 200 levels deep", () =>
  Effect.gen(function* () {
    let nested = Effect.all([ViewNote.check(note), EditNote.check(note).pipe(as("ada"))]);

    for (let level = 0; level < 200; level++)
      nested = nested.pipe(
        Permission.restrictTo(level % 2 === 0 ? [ViewNote, EditNote] : [EditNote, ViewNote, top]),
      );

    expect(yield* nested).toEqual([Decision.allow(), Decision.allow()]);
    expect(
      yield* ViewNote.check(note).pipe(
        Permission.restrictTo([ViewNote]),
        Permission.restrictTo([EditNote]),
      ),
    ).toEqual(Decision.restricted());
  }).pipe(Effect.provide(live)),
);

it.effect("runs 25 stacked taps once each, innermost first", () =>
  Effect.gen(function* () {
    const seen = yield* Ref.make<ReadonlyArray<number>>([]);

    const tapped = Array.from({ length: 25 }, (_, index) => index).reduce(
      (layer, index) =>
        Layer.effect(
          ViewNote,
          Effect.map(
            ViewNote,
            Permission.tap(() => Ref.update(seen, (indexes) => [...indexes, index])),
          ),
        ).pipe(Layer.provide(layer)),
      // SAFETY: live provides ViewNote among others; only ViewNote is tapped.
      live as Layer.Layer<ViewNote>,
    );

    yield* ViewNote.require(note).pipe(Effect.provide(tapped));

    expect(yield* Ref.get(seen)).toEqual(Array.from({ length: 25 }, (_, index) => index));
  }),
);

it.effect("neither applies nor records a decision interrupted while its policy runs", () =>
  Effect.gen(function* () {
    const applied = yield* Ref.make(false);

    const slow = ViewNote.toLayer(() => Effect.as(Effect.sleep("1 hour"), Decision.allow())).pipe(
      PermissionAudit.record(ViewNote),
    );

    const fiber = yield* ViewNote.require(note).pipe(
      Effect.andThen(Ref.set(applied, true)),
      Effect.provide(slow),
      Effect.forkChild,
    );

    yield* TestClock.adjust("30 minutes");
    yield* Fiber.interrupt(fiber);

    const exit = yield* Fiber.await(fiber);

    expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
    expect(yield* Ref.get(applied)).toBe(false);
    expect(yield* TestAuditLog.entries).toEqual([]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("decodes 20,000 stored scopes against a set of 1,000 permissions", () =>
  Effect.gen(function* () {
    const many = Array.from({ length: 1_000 }, (_, index) =>
      Permission.Service<Step>()(`limits/Scope${index}`, { id: `scopes.${index}` }),
    );

    const [first, ...rest] = many;

    if (first === undefined) return expect.unreachable("Sets are never empty");

    const Scopes = Permission.set([first, ...rest]);

    const stored = Array.from({ length: 20_000 }, (_, index) => `scopes.${index}`);

    const scopes = yield* Schema.decodeEffect(Scopes.schema)(stored);

    expect(scopes).toHaveLength(1_000);
  }),
);

it.effect("gives each concurrent fiber the filter its restriction allows", () =>
  Effect.gen(function* () {
    const conditions = yield* Effect.forEach(
      Array.from({ length: 1_000 }, (_, index) => index),
      (index) =>
        index % 2 === 0
          ? ViewNoteFilter.condition
          : ViewNoteFilter.condition.pipe(Permission.restrictTo([EditNote])),
      { concurrency: "unbounded" },
    );

    expect(conditions.map((condition) => Condition.matches(condition, note))).toEqual(
      conditions.map((_, index) => index % 2 === 0),
    );
  }).pipe(Effect.provide(live)),
);
