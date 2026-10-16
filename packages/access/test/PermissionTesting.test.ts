import { it } from "@effect/vitest";
import { Cause, Effect, Exit, Layer } from "effect";
import { expect } from "vitest";

import { PermissionFilter } from "../src/index.ts";
import { PermissionTesting } from "../src/testing/index.ts";
import {
  as,
  CurrentCaller,
  EditNote,
  live,
  note,
  ViewNote,
  ViewNoteFilter,
  ViewNoteFilterLayer,
  ViewNoteLayer,
} from "./notes.ts";

const notes = [note, { ...note, id: "n2", hidden: true }];

it.effect("accepts filters matching exactly the targets the permission allows", () =>
  PermissionTesting.assertFilterAgrees(ViewNote, ViewNoteFilter, notes).pipe(
    Effect.provide(Layer.merge(ViewNoteLayer, ViewNoteFilterLayer)),
  ),
);

it.effect("dies on the first target where a filter and its permission disagree", () =>
  Effect.gen(function* () {
    const drifted = Layer.merge(
      ViewNoteLayer,
      ViewNoteFilter.toLayer((where) => where.all()),
    );

    const exit = yield* PermissionTesting.assertFilterAgrees(ViewNote, ViewNoteFilter, notes).pipe(
      Effect.provide(drifted),
      Effect.exit,
    );

    expect(Exit.isFailure(exit) && String(Cause.squash(exit.cause))).toContain(
      'The filter of permission notes.view matches a target the permission refuses: {"id":"n2"',
    );
  }),
);

class EditNoteFilter extends PermissionFilter.Service<EditNoteFilter>()(EditNote) {}

it.effect("counts checks refused by a required permission as refused", () =>
  Effect.gen(function* () {
    const filter = EditNoteFilter.toLayer(
      Effect.fn(function* (where) {
        const caller = yield* CurrentCaller;

        return where.and(where.eq("hidden", false), where.eq("authorId", caller.id));
      }),
    );

    yield* PermissionTesting.assertFilterAgrees(EditNote, EditNoteFilter, notes).pipe(
      as("ada"),
      Effect.provide(Layer.merge(live, filter)),
    );
  }),
);
