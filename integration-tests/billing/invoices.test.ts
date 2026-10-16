import { it } from "@effect/vitest";
import { Decision } from "@kutur-kit/access";
import { PermissionTesting } from "@kutur-kit/access/testing";
import { Effect, Layer, Redacted, Schema } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";

import { auditEntries, Database, invoices as invoicesTable } from "./database.ts";
import {
  CurrentUser,
  Invoice,
  InvoiceId,
  InvoiceNotFound,
  MembershipUnavailable,
  OrgId,
  UserId,
} from "./domain.ts";
import { Invoices } from "./invoices.ts";
import { Memberships } from "./memberships.ts";
import { AgentScopes, ApprovePayout, ViewInvoice, ViewInvoiceFilter } from "./permissions.ts";
import * as Policies from "./policies.ts";

const acme = OrgId.make("acme");

const globex = OrgId.make("globex");

const olivia = UserId.make("olivia");

const alex = UserId.make("alex");

const val = UserId.make("val");

const gus = UserId.make("gus");

const members = [
  { userId: olivia, orgId: acme, role: "Owner" },
  { userId: alex, orgId: acme, role: "Accountant" },
  { userId: val, orgId: acme, role: "Viewer" },
  { userId: gus, orgId: globex, role: "Owner" },
] as const;

const small = Invoice.make({
  id: InvoiceId.make("small"),
  orgId: acme,
  submittedBy: val,
  payee: "Paper Co",
  amount: 5_000,
  bankAccount: Redacted.make("DE89 3704 0044 0532 0130 00"),
  status: "Open",
});

const large = Invoice.make({ ...small, id: InvoiceId.make("large"), amount: 50_000 });

const own = Invoice.make({ ...small, id: InvoiceId.make("own"), submittedBy: olivia });

const foreign = Invoice.make({ ...small, id: InvoiceId.make("foreign"), orgId: globex });

const all = [small, large, own, foreign];

const seeded = Layer.effectDiscard(
  Effect.flatMap(Database, (database) =>
    database
      .insert(invoicesTable)
      .values(
        all.map((invoice) => ({ ...invoice, bankAccount: Redacted.value(invoice.bankAccount) })),
      )
      .pipe(Effect.orDie),
  ),
).pipe(Layer.provideMerge(Database.layer(members)));

const app = Invoices.layer.pipe(
  Layer.provideMerge(Policies.layer),
  Layer.provideMerge(Layer.merge(Memberships.layer, Database.auditLog)),
  Layer.provideMerge(seeded),
);

const everything = { limit: 100, offset: 0 };

const recorded = Effect.flatMap(Database, (database) =>
  database.select().from(auditEntries).pipe(Effect.orDie),
);

// The test clock only around the checks: the database client keeps the real one.
const at =
  (time: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    TestClock.setTime(Date.parse(time)).pipe(
      Effect.andThen(effect),
      Effect.provide(TestClock.layer()),
    );

const asUser = (id: typeof UserId.Type) => Effect.provideService(CurrentUser, { id });

const asAgent =
  (id: typeof UserId.Type, storedScopes: ReadonlyArray<string>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.flatMap(Effect.orDie(Schema.decodeEffect(AgentScopes.schema)(storedScopes)), (scopes) =>
      effect.pipe(AgentScopes.restrictTo(scopes), asUser(id)),
    );

const denied = new Decision.Denied({ permission: ApprovePayout.id });

it.effect("lists only invoices of the caller's organizations", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    const ids = (listed: ReadonlyArray<Invoice>) => listed.map((invoice) => invoice.id);

    expect(ids(yield* invoices.list(everything).pipe(asUser(val)))).toEqual([
      "large",
      "own",
      "small",
    ]);
    expect(ids(yield* invoices.list(everything).pipe(asUser(gus)))).toEqual(["foreign"]);
  }).pipe(Effect.provide(app)),
);

it.effect("pages through the caller's invoices in one query, without gaps", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    const ids = (page: { readonly limit: number; readonly offset: number }) =>
      invoices.list(page).pipe(
        asUser(val),
        Effect.map((listed) => listed.map((invoice) => invoice.id)),
      );

    expect(yield* ids({ limit: 2, offset: 0 })).toEqual(["large", "own"]);
    expect(yield* ids({ limit: 2, offset: 2 })).toEqual(["small"]);
  }).pipe(Effect.provide(app)),
);

it.effect("keeps the invoice filter in agreement with the view policy for every member", () =>
  Effect.forEach([olivia, alex, val, gus], (user) =>
    PermissionTesting.assertFilterAgrees(ViewInvoice, ViewInvoiceFilter, all).pipe(asUser(user)),
  ).pipe(Effect.provide(app)),
);

it.effect("lets accountants approve payouts up to their limit and owners above it", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    expect(yield* invoices.approve(small.id).pipe(asUser(alex))).toMatchObject({
      status: "Approved",
    });
    expect(yield* invoices.approve(large.id).pipe(asUser(alex), Effect.flip)).toEqual(denied);
    expect(yield* ApprovePayout.check(large).pipe(asUser(alex))).toEqual(
      Decision.deny("Over approval limit"),
    );
    expect(yield* invoices.approve(large.id).pipe(asUser(olivia))).toMatchObject({
      status: "Approved",
    });
  }).pipe(Effect.provide(app)),
);

it.effect("refuses approvals by submitters, owners included, and by viewers", () =>
  Effect.gen(function* () {
    expect(yield* ApprovePayout.check(own).pipe(asUser(olivia))).toEqual(
      Decision.deny("Submitters cannot approve"),
    );
    expect(yield* ApprovePayout.check(own).pipe(asUser(val))).toEqual(
      Decision.deny("Approvers only"),
    );
  }).pipe(Effect.provide(app)),
);

it.live("freezes payouts on the last day of the month while the ledger closes", () =>
  Effect.gen(function* () {
    const check = ApprovePayout.check(large).pipe(asUser(olivia));

    expect(yield* check.pipe(at("2026-01-31T09:00:00Z"))).toEqual(
      Decision.deny("Ledger is closing"),
    );
    expect(yield* check.pipe(at("2026-02-01T09:00:00Z"))).toEqual(Decision.allow());
  }).pipe(Effect.provide(app)),
);

it.effect("answers approvals of other organizations' invoices as not found", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    expect(yield* invoices.approve(foreign.id).pipe(asUser(olivia), Effect.flip)).toEqual(
      new InvoiceNotFound(),
    );
  }).pipe(Effect.provide(app)),
);

it.effect("limits agents to their token's scopes, hiding invoices they cannot view", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    const reader = asAgent(alex, ["invoices.view"]);
    const approver = asAgent(alex, ["invoices.view", "payouts.approve", "payouts.refund"]);
    const blind = asAgent(alex, ["payouts.approve"]);

    expect(yield* invoices.list(everything).pipe(reader)).toHaveLength(3);
    expect(yield* ApprovePayout.check(small).pipe(reader)).toEqual(Decision.restricted());
    expect(yield* invoices.approve(small.id).pipe(reader, Effect.flip)).toEqual(denied);
    expect(yield* invoices.list(everything).pipe(blind)).toEqual([]);
    expect(yield* invoices.approve(small.id).pipe(blind, Effect.flip)).toEqual(
      new InvoiceNotFound(),
    );
    expect(yield* invoices.approve(small.id).pipe(approver)).toMatchObject({ status: "Approved" });
  }).pipe(Effect.provide(app)),
);

it.effect("fails with the membership outage rather than refusing, and records no decision", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;
    const database = yield* Database;

    yield* database.$client.unsafe("DROP TABLE memberships");

    expect(yield* invoices.list(everything).pipe(asUser(alex), Effect.flip)).toEqual(
      new MembershipUnavailable(),
    );
    expect(yield* invoices.approve(small.id).pipe(asUser(alex), Effect.flip)).toEqual(
      new MembershipUnavailable(),
    );
    expect(yield* recorded).toEqual([]);
  }).pipe(Effect.provide(app)),
);

it.effect("audits approval decisions and approvals with ids and amounts, never bank accounts", () =>
  Effect.gen(function* () {
    const invoices = yield* Invoices;

    yield* invoices.approve(small.id).pipe(asUser(alex));
    yield* invoices.approve(large.id).pipe(asUser(alex), Effect.flip);

    // Entries share the test clock's time, so they are found by what they record.
    const entries = yield* recorded;

    const find = (action: string, outcome: string) =>
      entries.find((entry) => entry.action === action && entry.outcome === outcome);

    const smallView = { id: "small", orgId: "acme", amount: 5_000 };

    expect(find("payouts.approve", "Allow")).toMatchObject({ target: smallView });
    expect(find("invoice.approved", "success")?.target).toEqual(smallView);
    expect(entries).toHaveLength(3);
    expect(find("payouts.approve", "Deny")).toMatchObject({
      action: "payouts.approve",
      outcome: "Deny",
      details: { deniedBy: "policy" },
      reason: "Over approval limit",
      target: { id: "large", orgId: "acme", amount: 50_000 },
    });
  }).pipe(Effect.provide(app)),
);
