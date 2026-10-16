import * as Drizzle from "@kutur-kit/access/drizzle/postgres";
import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { and, eq, gt } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";

import { Database, documents } from "./database.ts";
import { type CurrentUser, type DirectoryUnavailable, Document } from "./domain.ts";
import {
  DeleteDocument,
  DeleteDocumentFilter,
  EditDocument,
  EditDocumentFilter,
  type Refused,
  ViewDocument,
  ViewDocumentFilter,
} from "./permissions.ts";

export interface Page {
  readonly limit: number;
  readonly offset: number;
}

export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  "DocumentNotFound",
  {},
) {}

export const DocumentEdited = AuditEvent.make("document.edited", {
  target: Document,
  details: Schema.Struct({ title: Schema.String }),
});

export const DocumentDeleted = AuditEvent.make("document.deleted", { target: Document });

export class Documents extends Context.Service<
  Documents,
  {
    readonly visible: (
      page: Page,
    ) => Effect.Effect<ReadonlyArray<string>, DirectoryUnavailable, CurrentUser>;
    /**
     * The next `limit` visible documents after the `after` id, or from the
     * start: each page costs the same however deep, unlike an offset.
     */
    readonly visibleAfter: (
      after: string | undefined,
      limit: number,
    ) => Effect.Effect<ReadonlyArray<string>, DirectoryUnavailable, CurrentUser>;
    readonly editable: (
      page: Page,
    ) => Effect.Effect<ReadonlyArray<string>, DirectoryUnavailable, CurrentUser>;
    readonly deletable: (
      page: Page,
    ) => Effect.Effect<ReadonlyArray<string>, DirectoryUnavailable, CurrentUser>;
    readonly edit: (
      id: string,
      title: string,
    ) => Effect.Effect<void, DocumentNotFound | Refused | DirectoryUnavailable, CurrentUser>;
    readonly delete: (
      id: string,
    ) => Effect.Effect<void, DocumentNotFound | Refused | DirectoryUnavailable, CurrentUser>;
  }
>()("workspaces/Documents") {
  static readonly layer = Layer.effect(
    Documents,
    Effect.gen(function* () {
      const database = yield* Database;
      const auditLog = yield* Audit.AuditLog;
      const editDocument = yield* EditDocument;
      const deleteDocument = yield* DeleteDocument;
      const viewDocumentFilter = yield* ViewDocumentFilter;
      const editDocumentFilter = yield* EditDocumentFilter;
      const deleteDocumentFilter = yield* DeleteDocumentFilter;

      const ids = Effect.fnUntraced(function* <E>(
        condition: Effect.Effect<Parameters<typeof Drizzle.where<Document>>[1], E, CurrentUser>,
        page: Page,
      ) {
        const rows = yield* database
          .select({ id: documents.id })
          .from(documents)
          .where(Drizzle.where(documents, yield* condition))
          .orderBy(documents.id)
          .limit(page.limit)
          .offset(page.offset)
          .pipe(Effect.orDie);

        return rows.map(({ id }) => id);
      });

      const find = (id: string) =>
        database
          .select()
          .from(documents)
          .where(eq(documents.id, id))
          .pipe(
            Effect.orDie,
            Effect.flatMap(([row]) =>
              row === undefined ? Effect.fail(new DocumentNotFound()) : Effect.succeed(row),
            ),
          );

      return Documents.of({
        visible: (page) => ids(viewDocumentFilter.condition, page),
        visibleAfter: Effect.fn("Documents.visibleAfter")(function* (
          after: string | undefined,
          limit: number,
        ) {
          const rows = yield* database
            .select({ id: documents.id })
            .from(documents)
            .where(
              and(
                Drizzle.where(documents, yield* viewDocumentFilter.condition),
                after === undefined ? undefined : gt(documents.id, after),
              ),
            )
            .orderBy(documents.id)
            .limit(limit)
            .pipe(Effect.orDie);

          return rows.map(({ id }) => id);
        }),
        editable: (page) => ids(editDocumentFilter.condition, page),
        deletable: (page) => ids(deleteDocumentFilter.condition, page),
        edit: Effect.fn("Documents.edit")(function* (id: string, title: string) {
          const document = yield* find(id);

          // A refusal to view answers as not found, so callers learn nothing.
          yield* editDocument
            .require(document)
            .pipe(
              Effect.catchIf(Schema.is(ViewDocument.Denied), () =>
                Effect.fail(new DocumentNotFound()),
              ),
            );

          yield* database
            .update(documents)
            .set({ title })
            .where(eq(documents.id, id))
            .pipe(
              Effect.andThen(DocumentEdited.log({ target: document, details: { title } })),
              Effect.provideService(Audit.AuditLog, auditLog),
              database.$client.withTransaction,
              Effect.orDie,
            );
        }),
        delete: Effect.fn("Documents.delete")(function* (id: string) {
          const document = yield* find(id);

          yield* deleteDocument
            .require(document)
            .pipe(
              Effect.catchIf(Schema.is(ViewDocument.Denied), () =>
                Effect.fail(new DocumentNotFound()),
              ),
            );

          yield* database
            .delete(documents)
            .where(eq(documents.id, id))
            .pipe(
              Effect.andThen(DocumentDeleted.log({ target: document })),
              Effect.provideService(Audit.AuditLog, auditLog),
              database.$client.withTransaction,
              Effect.orDie,
            );
        }),
      });
    }),
  );
}
