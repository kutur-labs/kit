import * as AuditKey from "@kutur-kit/audit/AuditKey";
import { Context, Schema } from "effect";

export const Role = Schema.Literals(["owner", "admin", "member", "guest"]);

export type Role = typeof Role.Type;

// Ids come from the database and other systems, so they are not trusted to
// make portable storage keys: the asset key schemas check them.
export const UserId = Schema.String.pipe(Schema.brand("UserId"), AuditKey.key);

export type UserId = typeof UserId.Type;

export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"), AuditKey.key);

export type ProjectId = typeof ProjectId.Type;

export const FileId = Schema.String.pipe(Schema.brand("FileId"), AuditKey.key);

export type FileId = typeof FileId.Type;

/** A stored avatar image. Each upload gets a new one, so its URL never changes content. */
export const AvatarId = Schema.String.pipe(Schema.brand("AvatarId"));

export type AvatarId = typeof AvatarId.Type;

export interface Membership {
  readonly userId: UserId;
  readonly orgId: string;
  readonly role: Role;
}

export const Project = Schema.Struct({
  id: ProjectId,
  orgId: Schema.String.pipe(AuditKey.key),
  name: Schema.String,
});

export type Project = typeof Project.Type;

/**
 * A file in a project. Its bytes are in storage; this row says who uploaded
 * it and whether the upload completed.
 */
export const File = Schema.Struct({
  id: FileId,
  projectId: ProjectId,
  orgId: Schema.String.pipe(AuditKey.key),
  name: Schema.String,
  contentType: Schema.String,
  size: Schema.Int,
  uploaderId: UserId,
  status: Schema.Literals(["pending", "ready"]),
});

export type File = typeof File.Type;

/** @effect-leakable-service */
export class CurrentUser extends Context.Service<CurrentUser, { readonly id: UserId }>()(
  "dataroom/CurrentUser",
) {}

export class ProjectNotFound extends Schema.TaggedError<
  ProjectNotFound,
  { readonly brand: unique symbol }
>()("ProjectNotFound", {}, { httpApiStatus: 404 }) {}

export class FileNotFound extends Schema.TaggedError<
  FileNotFound,
  { readonly brand: unique symbol }
>()("FileNotFound", {}, { httpApiStatus: 404 }) {}

/** Storage could not be reached; the request may succeed when retried. */
export class StorageUnavailable extends Schema.TaggedError<
  StorageUnavailable,
  { readonly brand: unique symbol }
>()("StorageUnavailable", {}, { httpApiStatus: 503 }) {}
