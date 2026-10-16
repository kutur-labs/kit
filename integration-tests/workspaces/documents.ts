import * as Drizzle from "@kutur-kit/access/drizzle/postgres";
import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { and, eq, gt } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";

import { Database, documents, Transactions } from "./database.ts";
import {
  type CurrentUser,
  type DirectoryUnavailable,
  Document,
  DocumentNotFound,
} from "./domain.ts";
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

export const DocumentEdited = AuditEvent.make("document.edited", {
  target: Document,
  details: Schema.Struct({ title: Schema.String }),
});

export const DocumentDeleted = AuditEvent.make("document.deleted", { target: Document });

export class Documents extends Context.Service<
  Documents,
  {
    /** The document, or not found when the caller cannot view it. */
    readonly view: (
      id: string,
    ) => Effect.Effect<Document, DocumentNotFound | DirectoryUnavailable, CurrentUser>;
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
      const transactions = yield* Transactions;
      const auditLog = yield* Audit.AuditLog;
      const viewDocument = yield* ViewDocument;
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

      const found = Effect.flatMap(([row]: ReadonlyArray<Document>) =>
        row === undefined ? Effect.fail(new DocumentNotFound()) : Effect.succeed(row),
      );

      const find = (id: string) =>
        database.select().from(documents).where(eq(documents.id, id)).pipe(Effect.orDie, found);

      /**
       * The row, locked until the caller's transaction ends: a change decided
       * on it cannot be overtaken by another one between the decision and the
       * write, and concurrent changes to one document run one after another.
       */
      const lock = (id: string) =>
        database
          .select()
          .from(documents)
          .where(eq(documents.id, id))
          .for("update")
          .pipe(Effect.orDie, found);

      // Policies read the directory in the same transaction, so they see the
      // state the change commits against.
      const transaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        transactions.run(Effect.provideService(effect, Audit.AuditLog, auditLog));

      // A refusal to view answers as not found, so callers learn nothing.
      const hidden = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.catchIf(effect, Schema.is(ViewDocument.Denied), () =>
          Effect.fail(new DocumentNotFound()),
        );

      return Documents.of({
        view: Effect.fn("Documents.view")(function* (id: string) {
          const document = yield* find(id);

          yield* viewDocument.require(document).pipe(hidden);

          return document;
        }),
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
          const document = yield* lock(id);

          yield* editDocument.require(document).pipe(hidden);
          yield* database
            .update(documents)
            .set({ title })
            .where(eq(documents.id, id))
            .pipe(Effect.orDie);
          yield* DocumentEdited.log({ target: document, details: { title } });
        }, transaction),
        delete: Effect.fn("Documents.delete")(function* (id: string) {
          const document = yield* lock(id);

          yield* deleteDocument.require(document).pipe(hidden);
          yield* database.delete(documents).where(eq(documents.id, id)).pipe(Effect.orDie);
          yield* DocumentDeleted.log({ target: document });
        }, transaction),
      });
    }),
  );
}
