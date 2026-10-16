import * as PgClient from "@effect/sql-pg/PgClient";
import { it } from "@effect/vitest";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import { getColumns, sql } from "drizzle-orm";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Cause, DateTime, Effect, Exit, Layer } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { expect } from "vitest";

import * as Audit from "../../src/Audit.ts";
import * as Postgres from "../../src/drizzle/postgres.ts";
import { AuditLogContract, TestAuditLog } from "../../src/testing/index.ts";

const name = "audit_entries";

// Each test gets its own database, with the table apps migrate from its definition.
const setup = Effect.gen(function* () {
  const client = yield* PgClient.make({ url: yield* PostgresContainer.database });

  const database = yield* PgDrizzle.makeWithDefaults().pipe(
    Effect.provideService(PgClient.PgClient, client),
  );

  const table = Postgres.auditEntries(name);

  const statements = yield* Effect.promise(async () =>
    generateMigration(await generateDrizzleJson({}), await generateDrizzleJson({ table })),
  );

  yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });

  // jsonb null and SQL NULL both read as null, so presence is selected apart.
  const entries = database
    .select({
      ...getColumns(table),
      hasTarget: sql<boolean>`${table.target} is not null`,
      hasDetails: sql<boolean>`${table.details} is not null`,
    })
    .from(table)
    .orderBy(table.at, table.id)
    .pipe(
      Effect.orDie,
      Effect.map((rows) =>
        rows.map(
          (row) =>
            new Audit.Entry({
              id: row.id,
              action: row.action,
              outcome: row.outcome,
              ...(row.reason !== null && { reason: row.reason }),
              ...(row.hasTarget && { target: row.target }),
              ...(row.hasDetails && { details: row.details }),
              ...(row.actorId !== null &&
                row.actorKind !== null && {
                  actor: {
                    id: row.actorId,
                    kind: row.actorKind,
                    ...(row.actorOnBehalfOf !== null && { onBehalfOf: row.actorOnBehalfOf }),
                  },
                }),
              at: DateTime.makeUnsafe(row.at),
              ...(row.traceId !== null && { traceId: row.traceId }),
              ...(row.spanId !== null && { spanId: row.spanId }),
            }),
        ),
      ),
    );

  return {
    client,
    layer: Postgres.layer(database, table),
    log: Postgres.make(database, table),
    reader: TestAuditLog.TestAuditLog.of({ entries }),
  };
}).pipe(Effect.provide([Reactivity.layer, postgres]));

const entry = new Audit.Entry({
  id: "0190a5e2-0000-7000-8000-000000000001",
  action: "invoice.approved",
  outcome: "success",
  at: DateTime.makeUnsafe("2026-01-01T00:00:00Z"),
});

class Rollback {
  readonly _tag = "Rollback";
}

for (const { name, run } of AuditLogContract.cases)
  it.effect(`PostgreSQL ${name}`, () =>
    Effect.gen(function* () {
      const { layer, reader } = yield* setup;

      yield* run.pipe(
        Effect.provide(Layer.merge(layer, Layer.succeed(TestAuditLog.TestAuditLog, reader))),
      );
    }).pipe(Effect.scoped),
  );

it.effect("writes entries in the caller's transaction, so they roll back with it", () =>
  Effect.gen(function* () {
    const { client, log, reader } = yield* setup;

    yield* log
      .record(entry, { isolated: false })
      .pipe(Effect.andThen(Effect.fail(new Rollback())), client.withTransaction, Effect.flip);

    expect(yield* reader.entries).toEqual([]);
  }).pipe(Effect.scoped),
);

it.effect("writes isolated entries on their own connection, so they survive a rollback", () =>
  Effect.gen(function* () {
    const { client, log, reader } = yield* setup;

    yield* log
      .record(entry, { isolated: true })
      .pipe(Effect.andThen(Effect.fail(new Rollback())), client.withTransaction, Effect.flip);

    expect(yield* reader.entries).toEqual([entry]);
  }).pipe(Effect.scoped),
);

it.effect("dies when the database rejects the write", () =>
  Effect.gen(function* () {
    const { client, log } = yield* setup;

    yield* client.unsafe(`DROP TABLE "${name}"`);

    const exit = yield* log.record(entry, { isolated: false }).pipe(Effect.exit);

    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
  }).pipe(Effect.scoped),
);

it.effect("keeps a JSON null target apart from no target", () =>
  Effect.gen(function* () {
    const { log, reader } = yield* setup;

    const nothing = new Audit.Entry({
      id: entry.id,
      action: entry.action,
      outcome: entry.outcome,
      target: null,
      at: entry.at,
    });

    yield* log.record(nothing, { isolated: false });

    expect(yield* reader.entries).toEqual([nothing]);
  }).pipe(Effect.scoped),
);
