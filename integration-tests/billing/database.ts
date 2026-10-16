import type { Membership } from "./memberships.ts";

import * as PgClient from "@effect/sql-pg/PgClient";
import * as AuditPostgres from "@kutur-kit/audit/drizzle/postgres";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { Context, Effect, Layer } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";

export const invoices = pgTable("invoices", {
  id: text().primaryKey(),
  orgId: text("org_id").notNull(),
  submittedBy: text("submitted_by").notNull(),
  payee: text().notNull(),
  amount: integer().notNull(),
  bankAccount: text("bank_account").notNull(),
  status: text({ enum: ["Open", "Approved"] }).notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    role: text({ enum: ["Owner", "Accountant", "Viewer"] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.orgId] })],
);

export const auditEntries = AuditPostgres.auditEntries("audit_entries");

const connect = (members: ReadonlyArray<Membership>) =>
  Effect.gen(function* () {
    const client = yield* PgClient.make({ url: yield* PostgresContainer.database });

    const database = yield* PgDrizzle.makeWithDefaults().pipe(
      Effect.provideService(PgClient.PgClient, client),
    );

    const statements = yield* Effect.promise(async () =>
      generateMigration(
        await generateDrizzleJson({}),
        await generateDrizzleJson({ invoices, memberships, auditEntries }),
      ),
    );

    yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });
    yield* database.insert(memberships).values([...members]);

    return database;
  }).pipe(Effect.orDie);

export class Database extends Context.Service<
  Database,
  Effect.Success<ReturnType<typeof connect>>
>()("billing/Database") {
  /** A fresh database each time the Layer is built. */
  static readonly layer = (members: ReadonlyArray<Membership>) =>
    Layer.effect(Database, connect(members)).pipe(Layer.provide([Reactivity.layer, postgres]));

  static readonly auditLog = Layer.unwrap(
    Effect.map(Database, (database) => AuditPostgres.layer(database, auditEntries)),
  );
}
