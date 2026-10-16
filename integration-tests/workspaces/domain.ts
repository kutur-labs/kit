import * as AuditKey from "@kutur-kit/audit/AuditKey";
import { Context, Schema } from "effect";

export const Role = Schema.Literals(["owner", "admin", "member", "guest"]);

export type Role = typeof Role.Type;

export const Document = Schema.Struct({
  id: Schema.String.pipe(AuditKey.key),
  orgId: Schema.String.pipe(AuditKey.key),
  teamId: Schema.NullOr(Schema.String),
  ownerId: Schema.String.pipe(AuditKey.key),
  visibility: Schema.Literals(["private", "team", "org", "public"]),
  status: Schema.Literals(["draft", "published", "archived"]),
  classification: Schema.Int,
  legalHold: Schema.Boolean,
  title: Schema.String,
});

export type Document = typeof Document.Type;

export interface Membership {
  readonly userId: string;
  readonly orgId: string;
  readonly role: Role;
  /** The highest classification the member may read. */
  readonly clearance: number;
  readonly teams: ReadonlyArray<string>;
}

export interface Share {
  readonly documentId: string;
  readonly userId: string;
  readonly access: "view" | "edit";
}

/** @effect-leakable-service */
export class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()(
  "workspaces/CurrentUser",
) {}

export class DirectoryUnavailable extends Schema.TaggedError<DirectoryUnavailable>()(
  "DirectoryUnavailable",
  {},
  { httpApiStatus: 503 },
) {}

export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  "DocumentNotFound",
  {},
  { httpApiStatus: 404 },
) {}
