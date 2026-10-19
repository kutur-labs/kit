import { it } from "@effect/vitest";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import { expect } from "vitest";

import { Decision, Permission, PermissionFilter } from "../src/index.ts";
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

class ApprovePayment extends Permission.Service<ApprovePayment>()("test/ApprovePayment", {
  target: Schema.Struct({ id: Schema.String, cents: Schema.BigInt }),
}) {}

class ApprovePaymentFilter extends PermissionFilter.Service<ApprovePaymentFilter>()(
  ApprovePayment,
) {}

it.effect("shows a disagreeing target that JSON cannot represent", () =>
  Effect.gen(function* () {
    const drifted = Layer.merge(
      ApprovePayment.toLayer(({ cents }) =>
        cents < 100_000n ? Decision.allow() : Decision.deny("Too large"),
      ),
      ApprovePaymentFilter.toLayer((where) => where.all()),
    );

    const exit = yield* PermissionTesting.assertFilterAgrees(ApprovePayment, ApprovePaymentFilter, [
      { id: "p1", cents: 500n },
      { id: "p2", cents: 250_000n },
    ]).pipe(Effect.provide(drifted), Effect.exit);

    expect(Exit.isFailure(exit) && String(Cause.squash(exit.cause))).toContain(
      'matches a target the permission refuses: {"id":"p2","cents":250000n}',
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
