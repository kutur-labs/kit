import type { AnyRelations } from "drizzle-orm";
import type { EffectDrizzleQueryError, QueryEffectHKTBase } from "drizzle-orm/effect-core";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { PgEffectDatabase } from "drizzle-orm/pg-core/effect";
import type * as SqlClient from "effect/sql/SqlClient";

import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { Context, DateTime, Effect, Layer, type Schema } from "effect";

import { AuditLog, type Entry } from "../Audit.ts";

interface QueryEffect extends QueryEffectHKTBase {
  readonly error: EffectDrizzleQueryError;
  readonly context: never;
}

/** A Drizzle Effect database for PostgreSQL, such as `drizzle-orm/effect-postgres`. */
export type Database = PgEffectDatabase<QueryEffect, PgQueryResultHKT, AnyRelations> & {
  readonly $client: SqlClient.SqlClient;
};

/** The entries table. Include it in the app's Drizzle schema so migrations create it. */
export const auditEntries = (name: string) =>
  pgTable(
    name,
    {
      id: uuid().primaryKey(),
      action: text().notNull(),
      outcome: text().notNull(),
      reason: text(),
      target: jsonb().$type<Schema.Json>(),
      details: jsonb().$type<Schema.Json>(),
      actorId: text("actor_id"),
      actorKind: text("actor_kind"),
      actorOnBehalfOf: text("actor_on_behalf_of"),
      at: timestamp({ precision: 3, withTimezone: true }).notNull(),
      traceId: text("trace_id"),
      spanId: text("span_id"),
    },
    (table) => [
      index(`${name}_at_idx`).on(table.at),
      index(`${name}_action_at_idx`).on(table.action, table.at),
      index(`${name}_actor_at_idx`).on(table.actorId, table.at),
    ],
  );

export type Table = ReturnType<typeof auditEntries>;

// SQL NULL means no value, so a JSON null is stored as the jsonb value null.
const json = (value: Schema.Json | undefined) =>
  value === undefined ? null : value === null ? sql`'null'::jsonb` : value;

export const make = (database: Database, table: Table) => {
  // Without the client's transaction connection in context, a statement runs
  // on its own pooled connection and commits on its own.
  const isolate = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.updateContext(effect, (context: Context.Context<never>) =>
      Context.omit(database.$client.transactionService)(context),
    );

  return AuditLog.of({
    record: (entry: Entry, { isolated }) => {
      const insert = database
        .insert(table)
        .values({
          id: entry.id,
          action: entry.action,
          outcome: entry.outcome,
          reason: entry.reason ?? null,
          target: json(entry.target),
          details: json(entry.details),
          actorId: entry.actor?.id ?? null,
          actorKind: entry.actor?.kind ?? null,
          actorOnBehalfOf: entry.actor?.onBehalfOf ?? null,
          at: DateTime.toDate(entry.at),
          traceId: entry.traceId ?? null,
          spanId: entry.spanId ?? null,
        })
        .onConflictDoNothing({ target: table.id });

      return (isolated ? isolate(insert) : insert).pipe(Effect.orDie, Effect.asVoid);
    },
  });
};

export const layer = (database: Database, table: Table) =>
  Layer.succeed(AuditLog, make(database, table));
