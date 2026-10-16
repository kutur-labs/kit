import { it } from "@effect/vitest";
import { Condition, Decision } from "@kutur-kit/access";
import { PermissionTesting } from "@kutur-kit/access/testing";
import { eq } from "drizzle-orm";
import { Deferred, Effect, Exit, Fiber, Option, Predicate, Ref, Schema } from "effect";
import { expect } from "vitest";

import { collector, outsider } from "./data.ts";
import {
  auditEntries,
  Database,
  documents as documentsTable,
  poolSize,
  shares as sharesTable,
} from "./database.ts";
import { Documents } from "./documents.ts";
import { DirectoryUnavailable, type Document, DocumentNotFound } from "./domain.ts";
import { app, asUser, documents, everyone, memberships, sample, shares } from "./fixture.ts";
import {
  AgentScopes,
  DeleteDocument,
  DeleteDocumentFilter,
  EditDocument,
  EditDocumentFilter,
  ViewDocument,
  ViewDocumentFilter,
} from "./permissions.ts";

const asAgent =
  (id: string, storedScopes: ReadonlyArray<string>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.flatMap(Effect.orDie(Schema.decodeEffect(AgentScopes.schema)(storedScopes)), (scopes) =>
      effect.pipe(AgentScopes.restrictTo(scopes), asUser(id)),
    );

const everything = { limit: 10_000, offset: 0 };

const matching = (condition: Condition.Condition<Document>) =>
  documents.flatMap((document) => (Condition.matches(condition, document) ? [document.id] : []));

it.effect(
  "agrees between each policy and its filter for a user of each kind and every document",
  () =>
    Effect.forEach(
      sample,
      (user) =>
        Effect.all([
          PermissionTesting.assertFilterAgrees(ViewDocument, ViewDocumentFilter, documents),
          PermissionTesting.assertFilterAgrees(EditDocument, EditDocumentFilter, documents),
          PermissionTesting.assertFilterAgrees(DeleteDocument, DeleteDocumentFilter, documents),
        ]).pipe(asUser(user)),
      { concurrency: sample.length, discard: true },
    ).pipe(Effect.provide(app)),
  600_000,
);

it.effect(
  "selects in PostgreSQL exactly the documents each filter matches, for every user",
  () =>
    Effect.gen(function* () {
      const store = yield* Documents;

      for (const user of everyone) {
        const [visible, editable, deletable] = yield* Effect.all([
          ViewDocumentFilter.condition,
          EditDocumentFilter.condition,
          DeleteDocumentFilter.condition,
        ]).pipe(asUser(user));

        const selected = yield* Effect.all([
          store.visible(everything),
          store.editable(everything),
          store.deletable(everything),
        ]).pipe(asUser(user));

        expect(selected, user).toEqual([
          matching(visible),
          matching(editable),
          matching(deletable),
        ]);
      }
    }).pipe(Effect.provide(app)),
  120_000,
);

it.effect("pages through thousands of visible documents without gaps or repeats", () =>
  Effect.gen(function* () {
    const store = yield* Documents;

    for (const user of [collector, "u01"]) {
      const all = yield* store.visible(everything).pipe(asUser(user));
      const paged: Array<string> = [];

      for (let offset = 0; offset < all.length; offset += 97)
        paged.push(...(yield* store.visible({ limit: 97, offset }).pipe(asUser(user))));

      expect(all.length).toBeGreaterThan(900);
      expect(paged).toEqual(all);
    }
  }).pipe(Effect.provide(app)),
);

it.effect("pages by cursor through the same documents as by offset", () =>
  Effect.gen(function* () {
    const store = yield* Documents;

    for (const user of [collector, "u01"]) {
      const all = yield* store.visible(everything).pipe(asUser(user));
      const paged: Array<string> = [];

      for (
        let page = yield* store.visibleAfter(undefined, 97).pipe(asUser(user));
        page.length > 0;
      ) {
        paged.push(...page);
        page = yield* store.visibleAfter(page.at(-1), 97).pipe(asUser(user));
      }

      expect(paged).toEqual(all);
    }
  }).pipe(Effect.provide(app)),
);

it.effect(
  "applies and audits only allowed edits under heavy concurrency",
  () =>
    Effect.gen(function* () {
      const store = yield* Documents;
      const database = yield* Database;

      const attempts = Array.from({ length: 400 }, (_, index) => ({
        user: everyone[(index * 7) % everyone.length] ?? outsider,
        document: documents[(index * 131) % documents.length],
        title: `Edited ${index}`,
      })).flatMap(({ document, ...attempt }) =>
        document === undefined ? [] : [{ ...attempt, document }],
      );

      const allowed = yield* Effect.forEach(attempts, ({ user, document }) =>
        EditDocument.check(document).pipe(Effect.map(Predicate.isTagged("Allow")), asUser(user)),
      );

      const exits = yield* Effect.forEach(
        attempts,
        ({ user, document, title }) =>
          store.edit(document.id, title).pipe(asUser(user), Effect.exit),
        { concurrency: 32 },
      );

      expect(exits.map(Exit.isSuccess)).toEqual(allowed);

      const recorded = yield* database.select().from(auditEntries).pipe(Effect.orDie);
      const decisions = recorded.filter(({ action }) => action === "documents.edit");

      expect(decisions).toHaveLength(attempts.length);
      expect(decisions.filter(({ outcome }) => outcome === "Allow")).toHaveLength(
        allowed.filter(Boolean).length,
      );
      expect(recorded.filter(({ action }) => action === "document.edited")).toHaveLength(
        allowed.filter(Boolean).length,
      );
    }).pipe(Effect.provide(app)),
  120_000,
);

it.live("decides an edit on the row it writes, after a concurrent change to it commits", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const database = yield* Database;

    const owned = documents.find(
      ({ ownerId, status, legalHold }) => ownerId === "u01" && status !== "archived" && !legalHold,
    );

    if (owned === undefined) return expect.unreachable("The seed gives u01 an editable document");

    const held = yield* Deferred.make<void>();
    const commit = yield* Deferred.make<void>();

    const hold = yield* database
      .update(documentsTable)
      .set({ legalHold: true })
      .where(eq(documentsTable.id, owned.id))
      .pipe(
        Effect.andThen(Deferred.succeed(held, undefined)),
        Effect.andThen(Deferred.await(commit)),
        database.$client.withTransaction,
        Effect.orDie,
        Effect.forkChild,
      );

    yield* Deferred.await(held);

    const edit = yield* store
      .edit(owned.id, "Under hold")
      .pipe(asUser("u01"), Effect.flip, Effect.forkChild);

    // Commit only once the edit waits for the row the hold has changed.
    yield* database.$client
      .unsafe<{ readonly waiting: number }>(
        `SELECT count(*)::int AS waiting FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'`,
      )
      .pipe(Effect.repeat({ until: ([row]) => (row?.waiting ?? 0) > 0 }), Effect.orDie);
    yield* Deferred.succeed(commit, undefined);
    yield* Fiber.join(hold);

    const [row] = yield* database
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, owned.id))
      .pipe(Effect.orDie);

    expect(yield* Fiber.join(edit)).toEqual(new Decision.Denied({ permission: "documents.edit" }));
    expect(row?.title).toBe(owned.title);
  }).pipe(Effect.provide(app)),
);

it.live("deadlocks once every connection holds a transaction deciding an audited permission", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const database = yield* Database;
    const editable = new Set(yield* store.editable(everything).pipe(asUser("u01")));
    const owned = documents.filter(({ id }) => editable.has(id));

    // Transactions open together, each locking its own document, then decide.
    // The decision's audit entry is written on another connection.
    const decideTogether = (count: number) =>
      Effect.gen(function* () {
        const opened = yield* Ref.make(0);
        const allOpen = yield* Deferred.make<void>();

        yield* Effect.forEach(
          owned.slice(0, count),
          (document) =>
            database
              .select()
              .from(documentsTable)
              .where(eq(documentsTable.id, document.id))
              .for("update")
              .pipe(
                Effect.andThen(Ref.updateAndGet(opened, (open) => open + 1)),
                Effect.flatMap((open) =>
                  open === count ? Deferred.succeed(allOpen, undefined) : Effect.void,
                ),
                Effect.andThen(Deferred.await(allOpen)),
                Effect.andThen(EditDocument.require(document)),
                database.$client.withTransaction,
                Effect.orDie,
              ),
          { concurrency: "unbounded", discard: true },
        );
      }).pipe(asUser("u01"));

    expect(owned.length).toBeGreaterThanOrEqual(poolSize);
    // `Transactions` therefore runs one fewer than there are connections.
    expect(yield* decideTogether(poolSize - 1).pipe(Effect.timeoutOption("10 seconds"))).toEqual(
      Option.some(undefined),
    );
    expect(yield* decideTogether(poolSize).pipe(Effect.timeoutOption("2 seconds"))).toEqual(
      Option.none(),
    );
  }).pipe(Effect.provide(app)),
);

it.effect("keeps decisions audited when the request's transaction rolls back", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const database = yield* Database;

    const owned = documents.find(
      ({ ownerId, status, legalHold }) => ownerId === "u01" && status !== "archived" && !legalHold,
    );

    if (owned === undefined) return expect.unreachable("The seed gives u01 an editable document");

    const exit = yield* store
      .edit(owned.id, "Rolled back")
      .pipe(
        Effect.andThen(Effect.fail("Request failed")),
        database.$client.withTransaction,
        asUser("u01"),
        Effect.exit,
      );

    const [row] = yield* database
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, owned.id))
      .pipe(Effect.orDie);

    const recorded = yield* database.select().from(auditEntries).pipe(Effect.orDie);

    expect(Exit.isFailure(exit)).toBe(true);
    expect(row?.title).toBe(owned.title);
    expect(recorded.map(({ action, outcome }) => `${action} ${outcome}`)).toEqual([
      "documents.edit Allow",
    ]);
  }).pipe(Effect.provide(app)),
);

it.effect("confines agents to their token's scopes, down to empty lists", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const owner = "u01";

    const visible = yield* store.visible(everything).pipe(asUser(owner));
    const editable = yield* store.editable(everything).pipe(asUser(owner));
    const editing = editable[0] ?? "doc-0000";

    const reader = asAgent(owner, ["documents.view"]);
    const blind = asAgent(owner, ["documents.edit"]);
    const none = asAgent(owner, ["documents.archive"]);

    expect(editable.length).toBeGreaterThan(0);
    expect(yield* store.visible(everything).pipe(reader)).toEqual(visible);
    expect(yield* store.editable(everything).pipe(reader)).toEqual([]);
    expect(yield* store.edit(editing, "Agent").pipe(reader, Effect.flip)).toEqual(
      new Decision.Denied({ permission: "documents.edit" }),
    );
    expect(yield* store.editable(everything).pipe(blind)).toEqual([]);
    expect(yield* store.edit(editing, "Agent").pipe(blind, Effect.flip)).toEqual(
      new DocumentNotFound(),
    );
    expect(yield* store.visible(everything).pipe(none)).toEqual([]);
  }).pipe(Effect.provide(app)),
);

it.effect("deletes each deletable document once under concurrent attempts", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const deletable = yield* store.deletable(everything).pipe(asUser("u01"));

    const exits = yield* Effect.forEach(
      [...deletable, ...deletable],
      (id) => store.delete(id).pipe(asUser("u01"), Effect.exit),
      { concurrency: 16 },
    );

    expect(deletable.length).toBeGreaterThan(0);
    expect(exits.filter(Exit.isSuccess)).toHaveLength(deletable.length);
    expect(yield* store.deletable(everything).pipe(asUser("u01"))).toEqual([]);
  }).pipe(Effect.provide(app)),
);

it.effect("audits edits refused because the document cannot be viewed", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const database = yield* Database;

    const hidden = documents.find(
      ({ orgId, visibility, status }) =>
        orgId === "o2" && visibility === "private" && status !== "published",
    );

    if (hidden === undefined) return expect.unreachable("The seed has private documents in o2");

    yield* store.edit(hidden.id, "Snooping").pipe(asUser(outsider), Effect.flip);

    const recorded = yield* database.select().from(auditEntries).pipe(Effect.orDie);

    expect(recorded.map(({ action, outcome, details }) => [action, outcome, details])).toEqual([
      ["documents.edit", "Deny", { deniedBy: "requirement", requirement: "documents.view" }],
    ]);
  }).pipe(Effect.provide(app)),
);

it.effect("fails with the directory's error rather than refusing when it is unavailable", () =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const database = yield* Database;
    const owner = sample[0] ?? "u01";

    const announced = documents.find(
      ({ visibility, status }) => visibility === "public" && status === "published",
    );

    const hidden = documents.find(
      ({ visibility, status }) => visibility === "private" && status === "draft",
    );

    if (announced === undefined || hidden === undefined)
      return expect.unreachable("The seed has public and private documents");

    yield* database.$client.unsafe("DROP TABLE memberships");

    expect(yield* ViewDocument.check(announced).pipe(asUser(owner))).toEqual(Decision.allow());
    expect(yield* ViewDocument.check(hidden).pipe(asUser(owner), Effect.flip)).toEqual(
      new DirectoryUnavailable(),
    );
    expect(yield* store.visible(everything).pipe(asUser(owner), Effect.flip)).toEqual(
      new DirectoryUnavailable(),
    );
    expect(yield* store.edit(hidden.id, "Lost").pipe(asUser(owner), Effect.flip)).toEqual(
      new DirectoryUnavailable(),
    );
  }).pipe(Effect.provide(app)),
);

it.effect("decides with the caller's uncommitted changes, as lookups join its transaction", () =>
  Effect.gen(function* () {
    const database = yield* Database;

    // A member who cannot see a private document unless it is shared with them.
    const candidate = memberships
      .filter(({ role }) => role === "member" || role === "guest")
      .flatMap((member) =>
        documents
          .filter(
            (document) =>
              document.orgId === member.orgId &&
              document.visibility === "private" &&
              document.status !== "archived" &&
              document.ownerId !== member.userId &&
              document.classification <= member.clearance &&
              !shares.some(
                (share) => share.userId === member.userId && share.documentId === document.id,
              ),
          )
          .map((document) => ({ user: member.userId, document })),
      )[0];

    if (candidate === undefined) return expect.unreachable("The seed has such a member");

    const { user, document } = candidate;

    const during = yield* database
      .insert(sharesTable)
      .values({ userId: user, documentId: document.id, access: "view" })
      .pipe(
        Effect.andThen(ViewDocument.check(document)),
        Effect.flatMap((decision) => Effect.fail(decision)),
        database.$client.withTransaction,
        Effect.flip,
        asUser(user),
      );

    expect(during).toEqual(Decision.allow());
    expect(yield* ViewDocument.check(document).pipe(asUser(user))).toEqual(Decision.deny());
  }).pipe(Effect.provide(app)),
);
