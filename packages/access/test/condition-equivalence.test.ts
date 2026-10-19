import * as PgClient from "@effect/sql-pg/PgClient";
import { layer } from "@effect/vitest";
import * as PostgresContainer from "@kutur-kit/testcontainers/PostgresContainer";
import { postgres } from "@kutur-kit/testcontainers/vitest";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api-postgres";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  real,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { Arbitrary, Context, Effect, Exit, Layer, Schema, SchemaGetter } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { expect } from "vitest";

import * as Drizzle from "../src/drizzle/postgres.ts";
import { Condition } from "../src/index.ts";

// Drizzle.where must select exactly the rows Condition.matches accepts, or a
// list would show what a check refuses or hide what it allows.

const documents = pgTable("documents", {
  id: text().primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  ownerId: text("owner_id").notNull(),
  reviewerId: text("reviewer_id"),
  status: text().notNull(),
  confidential: boolean().notNull(),
  pinned: boolean(),
  title: text().notNull(),
  priority: integer(),
  score: doublePrecision().notNull(),
  ratio: real().notNull(),
  views: bigint({ mode: "bigint" }).notNull(),
  ref: uuid(),
});

type Document = typeof documents.$inferSelect;

const values = {
  workspaceId: ["acme", "globex", "ACME", "acme "],
  ownerId: ["ada", "bo", "O'Brien", ""],
  reviewerId: ["ada", "cy", null],
  status: ["draft", "published", "archived", "in_review"],
  confidential: [false, true],
  pinned: [true, false, null],
  title: ["Plans", "plans", "Zo\u00eb", "Zoe\u0308", "📄 Q3 %_report", "", " Plans "],
  priority: [0, 1, -1, 5, null],
  score: [0, 0.1 + 0.2, 0.3, -2.5, 1e21, Number.NaN],
  // Single precision: 0.5 is exact, 0.1 is not.
  ratio: [0, 0.5, 0.1, Math.fround(0.1), -2.5],
  views: [0n, 9_007_199_254_740_993n, -5n, 42n],
  ref: ["0190a5e2-0000-7000-8000-000000000001", "ffffffff-ffff-4fff-bfff-ffffffffffff", null],
} satisfies { readonly [K in keyof Omit<Document, "id">]: ReadonlyArray<Document[K]> };

const cycle = <A>(pool: ReadonlyArray<A>, index: number): A => {
  const position = index % pool.length;

  if (!(position in pool)) throw new Error("Pools are never empty");

  // SAFETY: position is an index of pool, checked above.
  return pool[position] as A;
};

// Strides coprime with every pool's size spread the combinations over the rows.
const rows: ReadonlyArray<Document> = Array.from({ length: 120 }, (_, index) => ({
  id: `d${String(index).padStart(3, "0")}`,
  workspaceId: cycle(values.workspaceId, index),
  ownerId: cycle(values.ownerId, index * 3),
  reviewerId: cycle(values.reviewerId, index * 7),
  status: cycle(values.status, index * 5),
  confidential: cycle(values.confidential, index * 11),
  pinned: cycle(values.pinned, index * 13),
  title: cycle(values.title, index * 17),
  priority: cycle(values.priority, index * 19),
  score: cycle(values.score, index * 23),
  // A real column stores and returns the nearest single-precision value.
  ratio: Math.fround(cycle(values.ratio, index * 37)),
  views: cycle(values.views, index * 29),
  ref: cycle(values.ref, index * 31),
}));

const where = Condition.make<Document>();

const member = (user: string, workspaces: ReadonlyArray<string>) =>
  where.and(
    where.oneOf("workspaceId", workspaces),
    where.not(where.eq("status", "archived")),
    where.or(
      where.eq("status", "published"),
      where.eq("ownerId", user),
      where.and(where.eq("status", "draft"), where.not(where.eq("confidential", true))),
    ),
  );

const policies: ReadonlyArray<readonly [string, Condition.Condition<Document>]> = [
  ["a member's documents", member("ada", ["acme", "globex"])],
  ["a member with no workspaces", member("ada", [])],
  [
    "a review queue: assigned to me or unassigned, and not my own",
    where.and(
      where.eq("status", "in_review"),
      where.or(where.eq("reviewerId", "cy"), where.eq("reviewerId", null)),
      where.not(where.eq("ownerId", "cy")),
    ),
  ],
  ["documents not reviewed by me, including unassigned", where.not(where.eq("reviewerId", "ada"))],
  ["reviewers among a list that includes unassigned", where.oneOf("reviewerId", ["cy", null])],
  ["anything but unassigned", where.not(where.oneOf("reviewerId", [null]))],
  ["not pinned, where unknown counts as not pinned", where.not(where.eq("pinned", true))],
  ["explicitly unpinned only", where.eq("pinned", false)],
  ["priorities other than urgent, including none", where.not(where.oneOf("priority", [5]))],
  [
    "an agent restricted to documents it was shared",
    where.and(member("bo", ["acme"]), where.oneOf("id", ["d001", "d004", "d040", "d999"])),
  ],
  [
    "neither archived nor confidential, written as a negated disjunction",
    where.not(where.or(where.eq("status", "archived"), where.eq("confidential", true))),
  ],
  ["double negation", where.not(where.not(where.eq("workspaceId", "acme")))],
  ["exact strings: quotes, case, accents, spaces, emoji", where.oneOf("ownerId", ["O'Brien", ""])],
  ["case and trailing spaces differ", where.oneOf("workspaceId", ["ACME", "acme "])],
  ["composed and decomposed accents differ", where.eq("title", "Zo\u00eb")],
  ["LIKE wildcards are literal", where.eq("title", "📄 Q3 %_report")],
  ["empty string is not unknown", where.eq("title", "")],
  ["inexact floats compare exactly", where.eq("score", 0.1 + 0.2)],
  ["whole and fractional numbers in one list", where.oneOf("score", [-2.5, 0, 0.1 + 0.2])],
  ["large floats", where.eq("score", 1e21)],
  ["reals equal only what they store exactly", where.oneOf("ratio", [0.1, 0.5])],
  ["NaN equals NaN, as in SQL", where.eq("score", Number.NaN)],
  ["anything but NaN", where.not(where.oneOf("score", [Number.NaN]))],
  ["uuids, including unknown", where.oneOf("ref", ["0190a5e2-0000-7000-8000-000000000001", null])],
  ["zero priority is not unknown", where.eq("priority", 0)],
  ["bigints beyond 2^53", where.eq("views", 9_007_199_254_740_993n)],
  ["negative bigints", where.oneOf("views", [-5n, 42n])],
  ["all", where.all()],
  ["none", where.none()],
  ["empty and, empty or", where.or(where.and(), where.and(where.or()))],
  ["negated empty or", where.not(where.or())],
];

// SAFETY: values has exactly these keys.
const fields = Object.keys(values) as ReadonlyArray<keyof typeof values>;

/**
 * One of a pool's values. A declaration rather than literals, which cannot
 * hold NaN; generation picks an index into the pool.
 */
const among = <A extends Condition.Value>(pool: ReadonlyArray<A>) => {
  const is = (value: unknown): value is A => pool.some((each) => Object.is(each, value));

  return Schema.declare(is, {
    toCodecArbitrary: () =>
      Schema.link<A>()(Schema.Literals(pool.map((_, index) => index)), {
        decode: SchemaGetter.transform((index) => cycle(pool, index)),
        encode: SchemaGetter.transform((value) => pool.findIndex((each) => Object.is(each, value))),
      }),
  });
};

// Encoded conditions comparing the fields with values from the rows' pools,
// so comparisons hit as often as they miss.
const Generated: Schema.Codec<Condition.Encoded> = Schema.Union([
  Schema.TaggedStruct("All", {}),
  Schema.TaggedStruct("None", {}),
  ...fields.flatMap((name) => {
    const field = Schema.Literal(name);
    const value = among<Condition.Value>(values[name]);

    return [
      Schema.TaggedStruct("Eq", { field, value }),
      Schema.TaggedStruct("OneOf", { field, values: Schema.Array(value) }),
    ];
  }),
  Schema.TaggedStruct("And", { conditions: Schema.Array(Schema.suspend(() => Generated)) }),
  Schema.TaggedStruct("Or", { conditions: Schema.Array(Schema.suspend(() => Generated)) }),
  Schema.TaggedStruct("Not", { condition: Schema.suspend(() => Generated) }),
]);

const conditions: Arbitrary.Arbitrary<Condition.Condition<Document>> = Arbitrary.schema(
  Generated,
).pipe(Arbitrary.map(Schema.decodeSync(Condition.Node)));

/** The rows in a fresh database, seeded once for the tests below. */
class Documents extends Context.Service<Documents>()("test/Documents", {
  make: Effect.gen(function* () {
    const client = yield* PgClient.make({ url: yield* PostgresContainer.database });

    const database = yield* PgDrizzle.makeWithDefaults().pipe(
      Effect.provideService(PgClient.PgClient, client),
    );

    const statements = yield* Effect.promise(async () =>
      generateMigration(await generateDrizzleJson({}), await generateDrizzleJson({ documents })),
    );

    yield* Effect.forEach(statements, (statement) => client.unsafe(statement), { discard: true });
    yield* database.insert(documents).values([...rows]);

    return {
      select: (condition: Condition.Condition<Document>) =>
        database
          .select({ id: documents.id })
          .from(documents)
          .where(Drizzle.where(documents, condition))
          .orderBy(documents.id)
          .pipe(Effect.map((selected) => selected.map(({ id }) => id))),
    };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide([Reactivity.layer, postgres]),
  );
}

const select = (condition: Condition.Condition<Document>) =>
  Documents.use((documents) => documents.select(condition));

const matching = (condition: Condition.Condition<Document>) =>
  rows.flatMap((row) => (Condition.matches(condition, row) ? [row.id] : []));

layer(Documents.layer, { timeout: 60_000 })((it) => {
  it.effect("selects in PostgreSQL exactly the rows each policy matches in memory", () =>
    Effect.forEach(policies, ([name, condition]) =>
      Effect.map(select(condition), (selected) =>
        expect(selected, name).toEqual(matching(condition)),
      ),
    ),
  );

  it.effect.prop(
    "selects in PostgreSQL exactly the rows any condition matches in memory",
    [conditions],
    ([condition]) =>
      Effect.map(select(condition), (selected) => expect(selected).toEqual(matching(condition))),
    { timeout: 60_000, arbitrary: { runs: 400 } },
  );

  it.effect("handles membership lists longer than PostgreSQL's parameter limit", () =>
    Effect.gen(function* () {
      const shared = Array.from({ length: 70_000 }, (_, index) => `s${index}`).concat([
        "d001",
        "d050",
      ]);

      expect(yield* select(where.oneOf("id", shared))).toEqual(["d001", "d050"]);
    }),
  );

  // Not supported yet. Each test below states the behaviour we want and fails
  // today; `fails` passes while it does, and fails once the behaviour exists.

  // Each comparison is a parameter, and @effect/sql-pg sends at most 65535.
  it.effect.fails("selects with more separate comparisons than the parameter limit", () =>
    Effect.gen(function* () {
      const shared = Array.from({ length: 70_000 }, (_, index) => where.eq("id", `s${index}`));

      // Only the outcome, as the failed query would print all of its parameters.
      const exit = yield* select(where.or(...shared, where.eq("id", "d001"))).pipe(Effect.exit);

      expect(Exit.isSuccess(exit) ? exit.value : "failed").toEqual(["d001"]);
    }),
  );

  // Translation recurses once per level, so thousands of levels overflow the stack.
  it.effect.fails("selects with deeply nested conditions", () =>
    Effect.gen(function* () {
      const deep = Array.from({ length: 5_000 }).reduce<Condition.Condition<Document>>(
        (condition) => where.not(where.not(condition)),
        where.eq("id", "d001"),
      );

      expect(yield* select(deep)).toEqual(["d001"]);
    }),
  );
});
