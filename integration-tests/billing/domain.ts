import * as AuditKey from "@kutur-kit/audit/AuditKey";
import { Context, Schema } from "effect";

export const UserId = Schema.String.pipe(Schema.brand("UserId"), AuditKey.key);

export const OrgId = Schema.String.pipe(Schema.brand("OrgId"), AuditKey.key);

export const InvoiceId = Schema.String.pipe(Schema.brand("InvoiceId"), AuditKey.key);

export const Role = Schema.Literals(["Owner", "Accountant", "Viewer"]);

export type Role = typeof Role.Type;

/** @effect-leakable-service */
export class CurrentUser extends Context.Service<
  CurrentUser,
  { readonly id: typeof UserId.Type }
>()("billing/CurrentUser") {}

export const Invoice = Schema.Struct({
  id: InvoiceId,
  orgId: OrgId,
  submittedBy: UserId,
  payee: Schema.String,
  amount: Schema.Int,
  bankAccount: Schema.Redacted(Schema.String),
  status: Schema.Literals(["Open", "Approved"]),
});

export type Invoice = typeof Invoice.Type;

export class MembershipUnavailable extends Schema.TaggedError<MembershipUnavailable>()(
  "MembershipUnavailable",
  {},
  { httpApiStatus: 503 },
) {}

export class InvoiceNotFound extends Schema.TaggedError<InvoiceNotFound>()(
  "InvoiceNotFound",
  {},
  { httpApiStatus: 404 },
) {}
