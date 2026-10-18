import type { Decision } from "@kutur-kit/access";
import type { Asset, AssetBucket } from "@kutur-kit/assets";

import * as AssetSigning from "@kutur-kit/assets/AssetSigning";
import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { and, asc, eq } from "drizzle-orm";
import { ByteSize, Clock, Context, Crypto, Effect, Layer, Schema } from "effect";

import { type Documents, ProjectFile } from "./assets.ts";
import { Database, files, projects, Transactions } from "./database.ts";
import {
  CurrentUser,
  File,
  FileId,
  FileNotFound,
  Project,
  type ProjectId,
  ProjectNotFound,
  StorageUnavailable,
} from "./domain.ts";
import { DeleteFile, UploadFile, ViewFile, ViewProject } from "./permissions.ts";

export const FileUploaded = AuditEvent.make("file.uploaded", {
  target: File,
  details: Schema.Struct({ contentType: Schema.String, size: Schema.Int }),
});

/** A download link was handed out: who could read the file, and when. */
export const FileDownloadIssued = AuditEvent.make("file.download_issued", { target: File });

export const FileDeleted = AuditEvent.make("file.deleted", { target: File });

export type FileType = (typeof ProjectFile.contentTypes)[number];

export interface NewFile extends AssetSigning.Upload<FileType> {
  readonly name: string;
}

// Long enough to start a download, short enough that a leaked link soon stops working.
const downloadExpiry = "5 minutes";

/** Storage failures are retryable for the client; their causes are logged, not sent. */
const unavailable = (error: AssetBucket.AssetBucketError) =>
  Effect.andThen(Effect.logError("Storage failed", error), Effect.fail(new StorageUnavailable()));

export class ProjectFiles extends Context.Service<
  ProjectFiles,
  {
    /** A project's completed files, oldest first. */
    readonly list: (
      projectId: ProjectId,
    ) => Effect.Effect<ReadonlyArray<File>, ProjectNotFound, CurrentUser>;
    /** Records a pending file and signs the URL its bytes go to. */
    readonly start: (
      projectId: ProjectId,
      file: NewFile,
    ) => Effect.Effect<
      { readonly file: File; readonly upload: AssetSigning.SignedRequest },
      | ProjectNotFound
      | Decision.DeniedBy<"files.upload">
      | Asset.UnsupportedContentType
      | Asset.TooLarge
      | StorageUnavailable,
      CurrentUser
    >;
    /** Marks a pending file ready once its bytes are in storage as declared. */
    readonly complete: (
      id: FileId,
    ) => Effect.Effect<
      File,
      FileNotFound | AssetSigning.UploadNotConfirmed | StorageUnavailable,
      CurrentUser
    >;
    /** Signs a short-lived URL to download a ready file from storage. */
    readonly download: (
      id: FileId,
    ) => Effect.Effect<AssetSigning.SignedRequest, FileNotFound | StorageUnavailable, CurrentUser>;
    readonly remove: (
      id: FileId,
    ) => Effect.Effect<void, FileNotFound | Decision.DeniedBy<"files.delete">, CurrentUser>;
  }
>()("dataroom/ProjectFiles") {
  static readonly layer = Layer.effect(
    ProjectFiles,
    Effect.gen(function* () {
      const database = yield* Database;
      const transactions = yield* Transactions;
      const auditLog = yield* Audit.AuditLog;
      const crypto = yield* Crypto.Crypto;
      const viewProject = yield* ViewProject;
      const uploadFile = yield* UploadFile;
      const viewFile = yield* ViewFile;
      const deleteFile = yield* DeleteFile;

      // Storage, captured so operations need only the caller.
      const storage = yield* Effect.context<Documents | AssetSigning.SigningOf<Documents>>();

      const decodeFile = Schema.decodeUnknownEffect(File);
      const decodeProject = Schema.decodeUnknownEffect(Project);
      const decodeType = Schema.decodeEffect(ProjectFile.ContentType);

      const key = (file: File) => [file.projectId, "/", file.id] as const;

      // Rows are written by this service, so one that does not decode is a bug.
      const oneProject = Effect.flatMap(([row]: ReadonlyArray<typeof projects.$inferSelect>) =>
        row === undefined ? Effect.fail(new ProjectNotFound()) : Effect.orDie(decodeProject(row)),
      );

      const oneFile = Effect.flatMap(([row]: ReadonlyArray<typeof files.$inferSelect>) =>
        row === undefined ? Effect.fail(new FileNotFound()) : Effect.orDie(decodeFile(row)),
      );

      // A refusal to view answers as not found, so callers learn nothing.
      const hiddenProject = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.catchIf(effect, Schema.is(ViewProject.Denied), () =>
          Effect.fail(new ProjectNotFound()),
        );

      const hiddenFile = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.catchIf(effect, Schema.is(ViewFile.Denied), () => Effect.fail(new FileNotFound()));

      const project = (id: ProjectId) =>
        database
          .select()
          .from(projects)
          .where(eq(projects.id, id))
          .pipe(
            Effect.orDie,
            oneProject,
            Effect.tap((found) => hiddenProject(viewProject.require(found))),
          );

      const file = (id: FileId, lock: boolean) => {
        const query = database.select().from(files).where(eq(files.id, id));

        return (lock ? query.for("update") : query).pipe(
          Effect.orDie,
          oneFile,
          Effect.tap((found) => hiddenFile(viewFile.require(found))),
        );
      };

      // Policies read memberships in the same transaction, so a change commits
      // against what they saw; its audit entries commit with it.
      const transaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        transactions.run(Effect.provideService(effect, Audit.AuditLog, auditLog));

      return ProjectFiles.of({
        list: Effect.fn("ProjectFiles.list")(function* (projectId) {
          yield* project(projectId);

          const rows = yield* database
            .select()
            .from(files)
            .where(and(eq(files.projectId, projectId), eq(files.status, "ready")))
            .orderBy(asc(files.createdAt), asc(files.id))
            .pipe(Effect.orDie);

          return yield* Effect.forEach(rows, (row) => Effect.orDie(decodeFile(row)));
        }),
        start: Effect.fn("ProjectFiles.start")(function* (projectId, upload) {
          const found = yield* project(projectId);

          yield* uploadFile.require(found).pipe(hiddenProject);

          const user = yield* CurrentUser;
          const id = FileId.make(yield* Effect.orDie(crypto.randomUUIDv7()));

          const pending: File = {
            id,
            projectId,
            orgId: found.orgId,
            name: upload.name,
            contentType: upload.contentType,
            size: Number(upload.size),
            uploaderId: user.id,
            status: "pending",
          };

          // Signed first: a file the storage would refuse is never recorded.
          const signed = yield* AssetSigning.presignPut(ProjectFile, key(pending), upload).pipe(
            Effect.provide(storage),
            Effect.catchTags({ AssetBucketError: unavailable, AssetInvalidKey: Effect.die }),
          );

          yield* database
            .insert(files)
            .values({ ...pending, createdAt: new Date(yield* Clock.currentTimeMillis) })
            .pipe(Effect.orDie);

          return { file: pending, upload: signed };
        }),
        complete: Effect.fn("ProjectFiles.complete")(function* (id) {
          const found = yield* file(id, true);

          // Completing again answers as the first time did.
          if (found.status === "ready") return found;

          const contentType = yield* Effect.orDie(decodeType(found.contentType));

          yield* AssetSigning.confirm(ProjectFile, key(found), {
            contentType,
            size: ByteSize.bytes(found.size),
          }).pipe(
            Effect.provide(storage),
            Effect.catchTags({ AssetBucketError: unavailable, AssetInvalidKey: Effect.die }),
          );

          const ready: File = { ...found, status: "ready" };

          yield* database
            .update(files)
            .set({ status: "ready" })
            .where(eq(files.id, id))
            .pipe(Effect.orDie);
          yield* FileUploaded.log({
            target: ready,
            details: { contentType: ready.contentType, size: ready.size },
          });

          return ready;
        }, transaction),
        download: Effect.fn("ProjectFiles.download")(function* (id) {
          const found = yield* file(id, false);

          // The uploader sees a pending file, to complete it, but it has no bytes yet.
          yield* found.status === "ready" ? Effect.void : Effect.fail(new FileNotFound());

          const signed = yield* AssetSigning.presignGet(ProjectFile, key(found), {
            expiresIn: downloadExpiry,
          }).pipe(
            Effect.provide(storage),
            Effect.catchTags({ AssetBucketError: unavailable, AssetInvalidKey: Effect.die }),
          );

          yield* FileDownloadIssued.log({ target: found }).pipe(
            Effect.provideService(Audit.AuditLog, auditLog),
          );

          return signed;
        }),
        remove: Effect.fn("ProjectFiles.remove")(function* (id) {
          const found = yield* transaction(
            Effect.gen(function* () {
              const locked = yield* file(id, true);

              yield* deleteFile.require(locked).pipe(hiddenFile);
              yield* database.delete(files).where(eq(files.id, id)).pipe(Effect.orDie);
              yield* FileDeleted.log({ target: locked });

              return locked;
            }),
          );

          // After the commit: storage takes part in no transaction. A failure
          // leaves an object no row points to, which is logged for cleanup
          // rather than undoing a deletion the user was told succeeded.
          yield* ProjectFile.delete(key(found)).pipe(
            Effect.provide(storage),
            Effect.catchTags({
              AssetBucketError: (error) => Effect.logError("Orphaned stored file", error),
              AssetInvalidKey: Effect.die,
            }),
          );
        }),
      });
    }),
  );
}
