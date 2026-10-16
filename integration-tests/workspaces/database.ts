import type { Document, Membership, Share } from "./domain.ts";

import * as PgClient from "@effect/sql-pg/PgClient";
import * as AuditPostgres from "@kutur-kit/audit/drizzle/postgres";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { boolean, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { Context, Effect, Layer } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";

export const documents = pgTable("documents", {
  id: text().primaryKey(),
  orgId: text("org_id").notNull(),
  teamId: text("team_id"),
  ownerId: text("owner_id").notNull(),
  visibility: text({ enum: ["private", "team", "org", "public"] }).notNull(),
  status: text({ enum: ["draft", "published", "archived"] }).notNull(),
  classification: integer().notNull(),
  legalHold: boolean("legal_hold").notNull(),
  title: text().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    role: text({ enum: ["owner", "admin", "member", "guest"] }).notNull(),
    clearance: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.orgId] })],
);

export const teamMembers = pgTable(
  "team_members",
  {
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    teamId: text("team_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.teamId] })],
);

export const shares = pgTable(
  "shares",
  {
    userId: text("user_id").notNull(),
    documentId: text("document_id").notNull(),
    access: text({ enum: ["view", "edit"] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.documentId] })],
);

export const auditEntries = AuditPostgres.auditEntries("audit_entries");

export interface Seed {
  readonly documents: ReadonlyArray<Document>;
  readonly memberships: ReadonlyArray<Membership>;
  readonly shares: ReadonlyArray<Share>;
}

// Batches stay under the driver's parameter limit.
const batches = <A>(rows: ReadonlyArray<A>) =>
  Array.from({ length: Math.ceil(rows.length / 1_000) }, (_, index) =>
    rows.slice(index * 1_000, (index + 1) * 1_000),
  );

const connect = (seed: Seed) =>
  Effect.gen(function* () {
    const client = yield* PgClient.make({ url: yield* PostgresContainer.database });

    const database = yield* PgDrizzle.makeWithDefaults().pipe(
      Effect.provideService(PgClient.PgClient, client),
    );

    const statements = yield* Effect.promise(async () =>
      generateMigration(
        await generateDrizzleJson({}),
        await generateDrizzleJson({ documents, memberships, teamMembers, shares, auditEntries }),
      ),
    );

    yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });

    const teams = seed.memberships.flatMap(({ userId, orgId, teams: teamIds }) =>
      teamIds.map((teamId) => ({ userId, orgId, teamId })),
    );

    yield* Effect.forEach(batches(seed.documents), (rows) =>
      database.insert(documents).values(rows),
    );
    yield* Effect.forEach(batches(seed.memberships), (rows) =>
      database.insert(memberships).values(rows),
    );
    yield* Effect.forEach(batches(teams), (rows) => database.insert(teamMembers).values(rows));
    yield* Effect.forEach(batches(seed.shares), (rows) => database.insert(shares).values(rows));

    return database;
  }).pipe(Effect.orDie);

export class Database extends Context.Service<
  Database,
  Effect.Success<ReturnType<typeof connect>>
>()("workspaces/Database") {
  /** A fresh database each time the Layer is built. */
  static readonly layer = (seed: Seed) =>
    Layer.effect(Database, connect(seed)).pipe(Layer.provide([Reactivity.layer, postgres]));

  static readonly auditLog = Layer.unwrap(
    Effect.map(Database, (database) => AuditPostgres.layer(database, auditEntries)),
  );
}
