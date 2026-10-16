import type { Document, Membership, Share } from "./domain.ts";

import * as PgClient from "@effect/sql-pg/PgClient";
import * as AuditPostgres from "@kutur-kit/audit/drizzle/postgres";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { Context, Effect, Layer, Semaphore } from "effect";

import { storage, users } from "./accounts.ts";

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

/** Tokens an agent acts with for a user, limited to the stored permission ids. */
export const agentTokens = pgTable("agent_tokens", {
  id: text().primaryKey(),
  userId: text("user_id").notNull(),
  /** SHA-256 of the token, which is shown once and never stored. */
  tokenHash: text("token_hash").notNull().unique(),
  scopes: text().array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const auditEntries = AuditPostgres.auditEntries("audit_entries");

/**
 * Runs changes in transactions. A change decided inside its transaction also
 * records the decision on another connection, so that it outlives a rollback:
 * with a transaction on every connection, those writes would wait forever.
 * Running one transaction fewer than there are connections leaves them one.
 */
export class Transactions extends Context.Service<
  Transactions,
  {
    readonly run: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()("workspaces/Transactions") {
  static readonly layer = Layer.effect(
    Transactions,
    Effect.gen(function* () {
      const database = yield* Database;
      const permits = yield* Semaphore.make(poolSize - 1);

      return Transactions.of({
        run: (effect) =>
          effect.pipe(
            database.$client.withTransaction,
            Effect.catchTag("SqlError", Effect.die),
            Semaphore.withPermit(permits),
          ),
      });
    }),
  );
}

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
    const client = yield* PgClient.PgClient;
    const database = yield* PgDrizzle.makeWithDefaults();

    const statements = yield* Effect.promise(async () =>
      generateMigration(
        await generateDrizzleJson({}),
        await generateDrizzleJson({
          documents,
          memberships,
          teamMembers,
          shares,
          auditEntries,
          agentTokens,
          users,
          ...storage.schema,
        }),
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

/** Connections in the pool. */
export const poolSize = 10;

export class Database extends Context.Service<
  Database,
  Effect.Success<ReturnType<typeof connect>>
>()("workspaces/Database") {
  /** A fresh database each time the Layer is built, with its `Transactions`. */
  static readonly layer = (seed: Seed) =>
    Transactions.layer.pipe(
      Layer.provideMerge(Layer.effect(Database, connect(seed))),
      // Authentication's storage shares the client, so the same database.
      Layer.provideMerge(
        PgClient.layerFrom(
          Effect.flatMap(PostgresContainer.database, (url) =>
            PgClient.make({ url, maxConnections: poolSize }),
          ),
        ),
      ),
      Layer.provide(postgres),
    );

  static readonly auditLog = Layer.unwrap(
    Effect.map(Database, (database) => AuditPostgres.layer(database, auditEntries)),
  );
}
