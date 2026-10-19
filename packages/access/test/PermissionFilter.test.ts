import { it } from "@effect/vitest";
import { Effect, Tracer } from "effect";
import { expect } from "vitest";

import { Condition, Permission } from "../src/index.ts";
import { EditNote, live, note, ViewNoteFilter } from "./notes.ts";

const hidden = { ...note, hidden: true };

it.effect("gives the permission's condition, and none outside the caller's restriction", () =>
  Effect.gen(function* () {
    const visible = yield* ViewNoteFilter.condition;
    const restricted = yield* ViewNoteFilter.condition.pipe(Permission.restrictTo([EditNote]));

    expect([note, hidden].map((target) => Condition.matches(visible, target))).toEqual([
      true,
      false,
    ]);
    expect(Condition.matches(restricted, note)).toBe(false);
  }).pipe(Effect.provide(live)),
);

it.effect(
  "records the permission, the condition's kind and a restriction's refusal on its span",
  () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.NativeSpan> = [];

      const tracer = Tracer.make({
        span: (options) => {
          const span = new Tracer.NativeSpan(options);
          spans.push(span);

          return span;
        },
      });

      const matchesNothing = ViewNoteFilter.toLayer((where) => where.none());

      yield* ViewNoteFilter.condition.pipe(Effect.withTracer(tracer));
      yield* ViewNoteFilter.condition.pipe(
        Permission.restrictTo([EditNote]),
        Effect.withTracer(tracer),
      );
      yield* ViewNoteFilter.condition.pipe(
        Effect.withTracer(tracer),
        Effect.provide(matchesNothing),
      );

      const [allowed, restricted, none] = spans.map((span) => Object.fromEntries(span.attributes));

      expect(spans.map((span) => span.name)).toEqual(
        Array(3).fill("test/ViewNote/Filter.condition"),
      );
      expect(allowed).toEqual({ "access.permission": "notes.view", "access.condition": "Eq" });
      expect(restricted).toEqual({
        "access.permission": "notes.view",
        "access.condition": "None",
        "access.denied_by": "restriction",
      });
      expect(none).toEqual({ "access.permission": "notes.view", "access.condition": "None" });
    }).pipe(Effect.provide(live)),
);
