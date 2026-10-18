import type { Membership, Project } from "./domain.ts";

import * as PgClient from "@effect/sql-pg/PgClient";
import * as AuditPostgres from "@kutur-kit/audit/drizzle/postgres";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { Context, Effect, Layer, Semaphore } from "effect";

import { storage, users } from "./accounts.ts";

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    role: text({ enum: ["owner", "admin", "member", "guest"] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.orgId] })],
);

export const projects = pgTable("projects", {
  id: text().primaryKey(),
  orgId: text("org_id").notNull(),
  name: text().notNull(),
});

/**
 * Files in projects. A row is `pending` from the start of an upload until the
 * app confirms the bytes arrived in storage, and only then `ready`.
 */
export const files = pgTable("files", {
  id: text().primaryKey(),
  projectId: text("project_id").notNull(),
  orgId: text("org_id").notNull(),
  name: text().notNull(),
  contentType: text("content_type").notNull(),
  size: integer().notNull(),
  uploaderId: text("uploader_id").notNull(),
  status: text({ enum: ["pending", "ready"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const auditEntries = AuditPostgres.auditEntries("audit_entries");

/** Connections in the pool. */
export const poolSize = 10;

/**
 * Runs changes in transactions. A decision recorded inside one is written on
 * another connection to outlive a rollback, so one connection stays free.
 */
export class Transactions extends Context.Service<
  Transactions,
  {
    readonly run: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()("dataroom/Transactions") {
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
  readonly memberships: ReadonlyArray<Membership>;
  readonly projects: ReadonlyArray<Project>;
}

const connect = (seed: Seed) =>
  Effect.gen(function* () {
    const client = yield* PgClient.PgClient;
    const database = yield* PgDrizzle.makeWithDefaults();

    const statements = yield* Effect.promise(async () =>
      generateMigration(
        await generateDrizzleJson({}),
        await generateDrizzleJson({
          memberships,
          projects,
          files,
          auditEntries,
          users,
          ...storage.schema,
        }),
      ),
    );

    yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });
    yield* database.insert(memberships).values([...seed.memberships]);
    yield* database.insert(projects).values([...seed.projects]);

    return database;
  }).pipe(Effect.orDie);

export class Database extends Context.Service<
  Database,
  Effect.Success<ReturnType<typeof connect>>
>()("dataroom/Database") {
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
