import type * as Audit from "../src/Audit.ts";

// @effect-diagnostics missingEffectContext:off
import { type Effect, Schema } from "effect";
import { expectTypeOf, it } from "vitest";

import * as AuditEvent from "../src/AuditEvent.ts";

const Item = Schema.Struct({ id: Schema.String, email: Schema.String });

it("needs the audit log to log", () => {
  const SignIn = AuditEvent.make("session.sign-in", {});

  expectTypeOf(SignIn.log()).toEqualTypeOf<Effect.Effect<void, never, Audit.AuditLog>>();
});

it("requires the declared target, details and outcome", () => {
  const Approve = AuditEvent.make("payouts.approve", {
    target: Item,
    details: Schema.Struct({ amount: Schema.Int }),
    outcomes: ["Approved", "Refused"],
  });

  const input = { target: { id: "i1", email: "a@b.c" }, details: { amount: 1 } };

  expectTypeOf(Approve.log).toBeCallableWith({ ...input, outcome: "Refused" });
  // @ts-expect-error
  expectTypeOf(Approve.log).toBeCallableWith({ ...input, outcome: "Maybe" });
  // @ts-expect-error
  expectTypeOf(Approve.log).toBeCallableWith({ target: input.target, outcome: "Approved" });
  // @ts-expect-error
  expectTypeOf(Approve.log).toBeCallableWith();
});

it("rejects views describing fields the target does not have", () => {
  AuditEvent.make("items.view", { target: Item, view: Schema.Struct({ id: Schema.String }) });
  // @ts-expect-error
  AuditEvent.make("items.view", { target: Item, view: Schema.Struct({ name: Schema.String }) });
});

it("rejects views for events without a target", () => {
  AuditEvent.make("session.sign-in", { view: false });
  // @ts-expect-error
  AuditEvent.make("session.sign-in", { view: Schema.Struct({ id: Schema.String }) });
});
