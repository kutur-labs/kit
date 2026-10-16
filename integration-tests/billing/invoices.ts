import type { Decision } from "@kutur-kit/access";

import * as Drizzle from "@kutur-kit/access/drizzle/postgres";
import * as Audit from "@kutur-kit/audit/Audit";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer, Redacted, Schema } from "effect";

import { Database, invoices } from "./database.ts";
import {
  type CurrentUser,
  Invoice,
  InvoiceId,
  InvoiceNotFound,
  type MembershipUnavailable,
  OrgId,
  UserId,
} from "./domain.ts";
import { InvoiceApproved } from "./events.ts";
import { ApprovePayout, ViewInvoice, ViewInvoiceFilter } from "./permissions.ts";

export interface Page {
  readonly limit: number;
  readonly offset: number;
}

const toInvoice = (row: typeof invoices.$inferSelect) =>
  Invoice.make({
    id: InvoiceId.make(row.id),
    orgId: OrgId.make(row.orgId),
    submittedBy: UserId.make(row.submittedBy),
    payee: row.payee,
    amount: row.amount,
    bankAccount: Redacted.make(row.bankAccount),
    status: row.status,
  });

export class Invoices extends Context.Service<
  Invoices,
  {
    readonly list: (
      page: Page,
    ) => Effect.Effect<ReadonlyArray<Invoice>, MembershipUnavailable, CurrentUser>;
    readonly approve: (
      id: Invoice["id"],
    ) => Effect.Effect<
      Invoice,
      InvoiceNotFound | Decision.DeniedBy<typeof ApprovePayout.id> | MembershipUnavailable,
      CurrentUser
    >;
  }
>()("billing/Invoices") {
  static readonly layer = Layer.effect(
    Invoices,
    Effect.gen(function* () {
      const database = yield* Database;
      const viewInvoiceFilter = yield* ViewInvoiceFilter;
      const approvePayout = yield* ApprovePayout;
      const auditLog = yield* Audit.AuditLog;

      // One query whatever the caller may see, so pages have no gaps.
      const list = Effect.fn("Invoices.list")(function* (page: Page) {
        const rows = yield* database
          .select()
          .from(invoices)
          .where(Drizzle.where(invoices, yield* viewInvoiceFilter.condition))
          .orderBy(invoices.id)
          .limit(page.limit)
          .offset(page.offset)
          .pipe(Effect.orDie);

        return rows.map(toInvoice);
      });

      const approve = Effect.fn("Invoices.approve")(function* (id: Invoice["id"]) {
        const invoice = yield* database
          .select()
          .from(invoices)
          .where(eq(invoices.id, id))
          .pipe(
            Effect.orDie,
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.fail(new InvoiceNotFound())
                : Effect.succeed(toInvoice(row)),
            ),
          );

        yield* approvePayout
          .require(invoice)
          .pipe(
            Effect.catchIf(Schema.is(ViewInvoice.Denied), () => Effect.fail(new InvoiceNotFound())),
          );

        const approved = Invoice.make({ ...invoice, status: "Approved" });

        // The approval and its audit event commit together, or not at all.
        yield* database
          .update(invoices)
          .set({ status: "Approved" })
          .where(eq(invoices.id, id))
          .pipe(
            Effect.andThen(InvoiceApproved.log({ target: approved })),
            Effect.provideService(Audit.AuditLog, auditLog),
            database.$client.withTransaction,
            Effect.orDie,
          );

        return approved;
      });

      return Invoices.of({ list, approve });
    }),
  );
}
