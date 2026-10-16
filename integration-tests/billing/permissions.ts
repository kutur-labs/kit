import { Permission, PermissionFilter } from "@kutur-kit/access";
import { Schema } from "effect";

import { type CurrentUser, Invoice, MembershipUnavailable } from "./domain.ts";

export class ViewInvoice extends Permission.Service<ViewInvoice, { requires: CurrentUser }>()(
  "billing/ViewInvoice",
  { id: "invoices.view", target: Invoice, error: MembershipUnavailable },
) {}

export class ViewInvoiceFilter extends PermissionFilter.Service<ViewInvoiceFilter>()(ViewInvoice) {}

export class ApprovePayout extends Permission.Service<ApprovePayout, { requires: CurrentUser }>()(
  "billing/ApprovePayout",
  {
    id: "payouts.approve",
    target: Invoice,
    error: Schema.Union([ViewInvoice.Denied, MembershipUnavailable]),
  },
) {}

export const AgentScopes = Permission.set([ViewInvoice, ApprovePayout]);
