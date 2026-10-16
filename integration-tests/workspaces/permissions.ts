import type { Decision } from "@kutur-kit/access";

import { Permission, PermissionFilter } from "@kutur-kit/access";
import { Schema } from "effect";

import { type CurrentUser, DirectoryUnavailable, Document } from "./domain.ts";

export class ViewDocument extends Permission.Service<ViewDocument, { requires: CurrentUser }>()(
  "workspaces/ViewDocument",
  { id: "documents.view", target: Document, error: DirectoryUnavailable },
) {}

export class EditDocument extends Permission.Service<EditDocument, { requires: CurrentUser }>()(
  "workspaces/EditDocument",
  {
    id: "documents.edit",
    target: Document,
    error: Schema.Union([ViewDocument.Denied, DirectoryUnavailable]),
  },
) {}

export class DeleteDocument extends Permission.Service<DeleteDocument, { requires: CurrentUser }>()(
  "workspaces/DeleteDocument",
  {
    id: "documents.delete",
    target: Document,
    error: Schema.Union([ViewDocument.Denied, EditDocument.Denied, DirectoryUnavailable]),
  },
) {}

export class ViewDocumentFilter extends PermissionFilter.Service<ViewDocumentFilter>()(
  ViewDocument,
) {}

export class EditDocumentFilter extends PermissionFilter.Service<EditDocumentFilter>()(
  EditDocument,
) {}

export class DeleteDocumentFilter extends PermissionFilter.Service<DeleteDocumentFilter>()(
  DeleteDocument,
) {}

export const AgentScopes = Permission.set([ViewDocument, EditDocument, DeleteDocument]);

export type Refused = Decision.DeniedBy<"documents.view" | "documents.edit" | "documents.delete">;
