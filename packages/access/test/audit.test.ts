import { it } from "@effect/vitest";
import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditKey from "@kutur-kit/audit/AuditKey";
import { TestAuditLog } from "@kutur-kit/audit/testing";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import { expect } from "vitest";

import * as PermissionAudit from "../src/audit.ts";
import { Decision, Permission } from "../src/index.ts";
import { as, CurrentCaller, Publish, PublishLayer } from "./notes.ts";

const Item = Schema.Struct({
  id: Schema.String.pipe(AuditKey.key),
  ownerId: Schema.String.pipe(AuditKey.key),
  body: Schema.String,
});

const item = Item.make({ id: "i1", ownerId: "ada", body: "Private" });

class ViewItem extends Permission.Service<ViewItem>()("test/ViewItem", {
  id: "items.view",
  target: Item,
}) {}

class EditItem extends Permission.Service<EditItem, { requires: CurrentCaller }>()(
  "test/EditItem",
  { id: "items.edit", target: Item, error: ViewItem.Denied },
) {}

const ViewItemLayer = ViewItem.toLayer(() => Decision.allow()).pipe(
  PermissionAudit.record(ViewItem),
);

const EditItemLayer = EditItem.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewItem;

    return Effect.fn(function* (target) {
      yield* view.require(target);

      const caller = yield* CurrentCaller;

      return target.ownerId === caller.id ? Decision.allow() : Decision.deny("Owners only");
    });
  }),
).pipe(Layer.provide(ViewItemLayer), PermissionAudit.record(EditItem));

const audited = EditItemLayer.pipe(Layer.provideMerge(TestAuditLog.layer));

it.effect("records required permissions' decisions with the target's marked fields", () =>
  Effect.gen(function* () {
    yield* EditItem.require(item).pipe(as("ada"));

    const [view, edit] = yield* TestAuditLog.entries;

    expect(view).toMatchObject({
      action: "items.view",
      outcome: "Allow",
      target: { id: "i1", ownerId: "ada" },
    });
    expect(edit).toMatchObject({ action: "items.edit", outcome: "Allow" });
    expect(view).not.toHaveProperty("details");
  }).pipe(Effect.provide(audited)),
);

it.effect("records what refused a decision and the policy's reason", () =>
  Effect.gen(function* () {
    yield* EditItem.require(item).pipe(Permission.restrictTo([ViewItem]), as("ada"), Effect.flip);
    yield* EditItem.require(item).pipe(as("bo"), Effect.flip);

    const [restricted, , refused] = yield* TestAuditLog.entries;

    expect(restricted).toMatchObject({ outcome: "Deny", details: { deniedBy: "restriction" } });
    expect(restricted).not.toHaveProperty("reason");
    expect(refused).toMatchObject({
      outcome: "Deny",
      reason: "Owners only",
      details: { deniedBy: "policy" },
    });
  }).pipe(Effect.provide(audited)),
);

it.effect("records refusals caused by a required permission", () =>
  Effect.gen(function* () {
    yield* EditItem.require(item).pipe(Permission.restrictTo([EditItem]), as("ada"), Effect.flip);

    const [, edit] = yield* TestAuditLog.entries;

    expect(edit).toMatchObject({
      action: "items.edit",
      outcome: "Deny",
      details: { deniedBy: "requirement", requirement: "items.view" },
    });
  }).pipe(Effect.provide(audited)),
);

it.effect("records no checks, nor the requires their policies make", () =>
  Effect.gen(function* () {
    yield* ViewItem.check(item).pipe(Effect.provide(ViewItemLayer));
    yield* EditItem.check(item).pipe(as("ada"), Effect.provide(EditItemLayer));

    expect(yield* TestAuditLog.entries).toEqual([]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records the target through an explicit view", () =>
  Effect.gen(function* () {
    const OwnerOnly = ViewItem.toLayer(() => Decision.allow()).pipe(
      PermissionAudit.record(ViewItem, { view: Schema.Struct({ ownerId: Schema.String }) }),
    );

    yield* ViewItem.require(item).pipe(Effect.provide(OwnerOnly));

    const [entry] = yield* TestAuditLog.entries;

    expect(entry?.target).toEqual({ ownerId: "ada" });
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records decisions of permissions without a target, with no target", () =>
  Effect.gen(function* () {
    yield* Publish.require().pipe(
      as("ada"),
      Effect.provide(PublishLayer.pipe(PermissionAudit.record(Publish))),
    );

    const [entry] = yield* TestAuditLog.entries;

    expect(entry).toMatchObject({ action: "test/Publish", outcome: "Allow" });
    expect(entry).not.toHaveProperty("target");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("writes decisions outside the caller's transaction", () =>
  Effect.gen(function* () {
    const writes: Array<Audit.RecordOptions> = [];

    const spy = Layer.succeed(Audit.AuditLog, {
      record: (_, options) =>
        Effect.sync(() => {
          writes.push(options);
        }),
    });

    yield* ViewItem.require(item).pipe(Effect.provide(ViewItemLayer.pipe(Layer.provide(spy))));

    expect(writes).toEqual([{ isolated: true }]);
  }),
);

it.effect("fails checks with the audit log's defect, so unrecorded decisions never apply", () =>
  Effect.gen(function* () {
    const failing = Layer.succeed(Audit.AuditLog, {
      record: () => Effect.die("Audit store unavailable"),
    });

    const exit = yield* ViewItem.require(item).pipe(
      Effect.provide(ViewItemLayer.pipe(Layer.provide(failing))),
      Effect.exit,
    );

    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBe("Audit store unavailable");
  }),
);
