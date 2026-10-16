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

it.effect("records the permission and the condition's kind on its span", () =>
  Effect.gen(function* () {
    const spans: Array<Tracer.NativeSpan> = [];

    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        spans.push(span);

        return span;
      },
    });

    yield* ViewNoteFilter.condition.pipe(Effect.withTracer(tracer));

    const [span] = spans;

    expect(span?.name).toBe("test/ViewNote/Filter.condition");
    expect(Object.fromEntries(span?.attributes ?? [])).toMatchObject({
      "access.permission": "notes.view",
      "access.condition": "Eq",
    });
  }).pipe(Effect.provide(live)),
);
