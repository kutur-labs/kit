// @effect-diagnostics missingEffectContext:off
import type * as Audit from "@kutur-kit/audit/Audit";

import { type Layer, Schema } from "effect";
import { expectTypeOf, it } from "vitest";

import * as PermissionAudit from "../src/audit.ts";
import { Decision, Permission } from "../src/index.ts";

class View extends Permission.Service<View>()("test/View", {
  target: Schema.Struct({ id: Schema.String, email: Schema.String }),
}) {}

class Publish extends Permission.Service<Publish>()("test/Publish", {}) {}

const ViewLayer = View.toLayer(() => Decision.allow());

const PublishLayer = Publish.toLayer(() => Decision.allow());

it("adds the audit log to the requirements of recorded Layers", () => {
  const recorded = ViewLayer.pipe(PermissionAudit.record(View));

  expectTypeOf<Layer.Success<typeof recorded>>().toEqualTypeOf<View>();
  expectTypeOf<Layer.Services<typeof recorded>>().toEqualTypeOf<Audit.AuditLog>();
});

it("rejects views describing fields the target does not have", () => {
  ViewLayer.pipe(PermissionAudit.record(View, { view: Schema.Struct({ id: Schema.String }) }));
  ViewLayer.pipe(PermissionAudit.record(View, { view: false }));
  // @ts-expect-error
  ViewLayer.pipe(PermissionAudit.record(View, { view: Schema.Struct({ name: Schema.String }) }));
});

it("rejects views for permissions without a target", () => {
  PublishLayer.pipe(PermissionAudit.record(Publish, { view: false }));
  const view = Schema.Struct({ id: Schema.String });

  // @ts-expect-error
  PublishLayer.pipe(PermissionAudit.record(Publish, { view }));
});
