import type * as Drizzle from "../src/drizzle/postgres.ts";

import { bigint, char, customType, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { expectTypeOf, it } from "vitest";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

it("accepts only columns whose SQL equality is JavaScript's", () => {
  const comparable = pgTable("comparable", { id: text().primaryKey() });

  expectTypeOf(comparable).toExtend<Drizzle.Columns<typeof comparable.$inferSelect>>();

  const decimals = pgTable("decimals", { id: text().primaryKey(), value: numeric().notNull() });
  const handles = pgTable("handles", { id: text().primaryKey(), value: citext().notNull() });

  const counters = pgTable("counters", {
    id: text().primaryKey(),
    value: bigint({ mode: "string" }).notNull(),
  });

  expectTypeOf(decimals).not.toExtend<Drizzle.Columns<typeof decimals.$inferSelect>>();
  expectTypeOf(handles).not.toExtend<Drizzle.Columns<typeof handles.$inferSelect>>();
  expectTypeOf(counters).not.toExtend<Drizzle.Columns<typeof counters.$inferSelect>>();
});

it("does not tell char from text in types, leaving it to the runtime check", () => {
  const padded = pgTable("padded", { id: char({ length: 5 }).primaryKey() });

  expectTypeOf(padded).toExtend<Drizzle.Columns<typeof padded.$inferSelect>>();
});
