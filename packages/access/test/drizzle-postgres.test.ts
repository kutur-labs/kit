import * as PgClient from "@effect/sql-pg/PgClient";
import { it } from "@effect/vitest";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import {
  boolean,
  char,
  customType,
  integer,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { Effect } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { expect, it as test } from "vitest";

import * as Drizzle from "../src/drizzle/postgres.ts";
import { Condition } from "../src/index.ts";

const rows = pgTable("rows", {
  id: text().primaryKey(),
  org: text(),
  amount: integer().notNull(),
  open: boolean().notNull(),
});

type Row = typeof rows.$inferSelect;

const data: ReadonlyArray<Row> = [
  { id: "r1", org: "acme", amount: 5, open: true },
  { id: "r2", org: "acme", amount: 50, open: false },
  { id: "r3", org: "globex", amount: 5, open: false },
  { id: "r4", org: null, amount: 1, open: true },
];

const where = Condition.make<Row>();

it.effect("selects exactly the rows a condition matches in memory", () =>
  Effect.gen(function* () {
    const client = yield* PgClient.make({ url: yield* PostgresContainer.database });

    const database = yield* PgDrizzle.makeWithDefaults().pipe(
      Effect.provideService(PgClient.PgClient, client),
    );

    const statements = yield* Effect.promise(async () =>
      generateMigration(await generateDrizzleJson({}), await generateDrizzleJson({ rows })),
    );

    yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });
    yield* database.insert(rows).values([...data]);

    const conditions = [
      where.all(),
      where.none(),
      where.eq("org", "acme"),
      where.eq("org", null),
      where.oneOf("amount", [5, 1]),
      where.oneOf("org", []),
      where.and(where.eq("org", "acme"), where.eq("open", true)),
      where.or(where.eq("amount", 50), where.not(where.eq("open", false))),
      where.and(),
      where.or(),
      where.not(where.oneOf("id", ["r1", "r2"])),
      where.not(where.eq("org", "acme")),
      where.not(where.oneOf("org", ["globex"])),
    ];

    for (const condition of conditions) {
      const selected = yield* database
        .select({ id: rows.id })
        .from(rows)
        .where(Drizzle.where(rows, condition))
        .orderBy(rows.id);

      expect(
        selected.map(({ id }) => id),
        JSON.stringify(condition),
      ).toEqual(data.flatMap((row) => (Condition.matches(condition, row) ? [row.id] : [])));
    }
  }).pipe(Effect.scoped, Effect.provide([Reactivity.layer, postgres])),
);

const citext = customType<{ data: string }>({ dataType: () => "citext" });

// Columns whose SQL equality differs from JavaScript's: numeric values arrive
// as decimal text, char values space padded, citext compares ignoring case.
const ledger = pgTable("ledger", {
  id: text().primaryKey(),
  balance: numeric().notNull(),
  code: char({ length: 5 }).notNull(),
  handle: citext().notNull(),
  account: uuid().notNull(),
});

type Entry = typeof ledger.$inferSelect;

const entry = Condition.make<Entry>();

const ledgerColumns: object = ledger;

// SAFETY: deliberately bypasses the type check the runtime check backs up.
const unchecked = ledgerColumns as Drizzle.Columns<Entry>;

test("rejects columns whose SQL equality differs from JavaScript's", () => {
  expect(() => Drizzle.where(unchecked, entry.eq("balance", "1.00"))).toThrow(
    "Column balance (numeric) compares differently in PostgreSQL than in JavaScript",
  );
  expect(() => Drizzle.where(unchecked, entry.eq("code", "ab"))).toThrow(
    "Column code (char(5)) compares differently in PostgreSQL than in JavaScript",
  );
  expect(() => Drizzle.where(unchecked, entry.oneOf("handle", ["ada"]))).toThrow(
    "Column handle (citext) compares differently in PostgreSQL than in JavaScript",
  );
});

test("rejects uuids PostgreSQL would read differently from how JavaScript compares them", () => {
  const canonical = "0190a5e2-0000-7000-8000-000000000001";

  expect(() => Drizzle.where(unchecked, entry.eq("account", canonical))).not.toThrow();
  expect(() => Drizzle.where(unchecked, entry.eq("account", canonical.toUpperCase()))).toThrow(
    `Uuid ${canonical.toUpperCase()} is not lowercase and canonical`,
  );
  expect(() => Drizzle.where(unchecked, entry.oneOf("account", ["{" + canonical + "}"]))).toThrow(
    "is not lowercase and canonical",
  );
});
