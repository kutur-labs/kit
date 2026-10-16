import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { Schema } from "effect";

import { Invoice, InvoiceId, OrgId } from "./domain.ts";

export const InvoiceApproved = AuditEvent.make("invoice.approved", {
  target: Invoice,
  view: Schema.Struct({ id: InvoiceId, orgId: OrgId, amount: Schema.Int }),
});
