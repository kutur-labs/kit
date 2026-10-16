import { Decision } from "@kutur-kit/access";
import * as PermissionAudit from "@kutur-kit/access/audit";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { CurrentUser, InvoiceId, OrgId } from "./domain.ts";
import { Memberships } from "./memberships.ts";
import { ApprovePayout, ViewInvoice, ViewInvoiceFilter } from "./permissions.ts";

const accountantLimit = 10_000;

export const ViewInvoiceLayer = ViewInvoice.toLayer(
  Effect.gen(function* () {
    const memberships = yield* Memberships;

    return Effect.fn(function* (invoice) {
      const user = yield* CurrentUser;
      const role = yield* memberships.roleIn(user.id, invoice.orgId);

      return Option.isSome(role) ? Decision.allow() : Decision.deny();
    });
  }),
);

// The same rule as ViewInvoiceLayer, as a condition for listing: one membership
// lookup for the caller instead of one per invoice.
export const ViewInvoiceFilterLayer = ViewInvoiceFilter.toLayer(
  Effect.gen(function* () {
    const memberships = yield* Memberships;

    return Effect.fn(function* (where) {
      const user = yield* CurrentUser;

      return where.oneOf("orgId", yield* memberships.orgsOf(user.id));
    });
  }),
);

export const ApprovePayoutLayer = ApprovePayout.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewInvoice;
    const memberships = yield* Memberships;

    return Effect.fn(function* (invoice) {
      yield* view.require(invoice);

      const user = yield* CurrentUser;

      if (invoice.submittedBy === user.id) return Decision.deny("Submitters cannot approve");

      const now = yield* DateTime.now;

      if (DateTime.getPartUtc(DateTime.add(now, { days: 1 }), "day") === 1)
        return Decision.deny("Ledger is closing");

      const role = yield* memberships.roleIn(user.id, invoice.orgId);

      if (Option.contains(role, "Owner")) return Decision.allow();

      if (!Option.contains(role, "Accountant")) return Decision.deny("Approvers only");

      return invoice.amount <= accountantLimit
        ? Decision.allow()
        : Decision.deny("Over approval limit");
    });
  }),
).pipe(
  Layer.provide(ViewInvoiceLayer),
  PermissionAudit.record(ApprovePayout, {
    view: Schema.Struct({ id: InvoiceId, orgId: OrgId, amount: Schema.Int }),
  }),
);

export const layer = Layer.mergeAll(ViewInvoiceLayer, ViewInvoiceFilterLayer, ApprovePayoutLayer);
