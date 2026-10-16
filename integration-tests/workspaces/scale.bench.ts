import type { CurrentUser, Document } from "./domain.ts";

import * as Drizzle from "@kutur-kit/access/drizzle/postgres";
import { count, inArray } from "drizzle-orm";
import { Effect, Layer, ManagedRuntime, Tracer } from "effect";
import { afterAll, beforeAll, test } from "vitest";

import { Database, documents } from "./database.ts";
import { Directory } from "./directory.ts";
import { Documents } from "./documents.ts";
import { asUser } from "./fixture.ts";
import {
  DeleteDocumentFilter,
  EditDocumentFilter,
  ViewDocument,
  ViewDocumentFilter,
} from "./permissions.ts";
import * as Policies from "./policies.ts";

// A million documents and one user with as much access structure as we expect:
// 50 organizations as guest, member or admin with varied clearances, three
// teams in each and 50,000 shared documents.

const scale = 1_000_000;

const user = "heavy";

const app = Documents.layer.pipe(
  Layer.provideMerge(Policies.layer),
  Layer.provideMerge(Layer.merge(Database.auditLog, Directory.layer)),
  Layer.provideMerge(Database.layer({ documents: [], memberships: [], shares: [] })),
);

const runtime = ManagedRuntime.make(app);

const run = <A, E>(effect: Effect.Effect<A, E, Layer.Success<typeof app> | CurrentUser>) =>
  runtime.runPromise(effect.pipe(asUser(user)));

// Seeded inside PostgreSQL: a million rows from JavaScript would take minutes.
const seed = Effect.gen(function* () {
  const { $client: sql } = yield* Database;

  yield* sql.unsafe(`
    INSERT INTO documents
    SELECT 'doc-' || n, 'o' || n % 50,
      CASE WHEN n % 3 = 0 THEN NULL ELSE 'o' || n % 50 || '-t' || n % 7 END,
      'u' || n % 2000,
      (ARRAY['private', 'team', 'org', 'public'])[n % 4 + 1],
      (ARRAY['draft', 'published', 'published', 'archived'])[n / 4 % 4 + 1],
      n / 16 % 4, n % 10 = 0, 'Document ' || n
    FROM generate_series(1, ${scale}) n`);

  yield* sql.unsafe(`
    INSERT INTO memberships
    SELECT '${user}', 'o' || n,
      (ARRAY['admin', 'guest', 'member', 'member', 'member'])[n % 5 + 1], n % 4
    FROM generate_series(0, 49) n`);

  yield* sql.unsafe(`
    INSERT INTO team_members
    SELECT '${user}', 'o' || n / 3, 'o' || n / 3 || '-t' || n % 3
    FROM generate_series(0, 149) n`);

  yield* sql.unsafe(`
    INSERT INTO shares
    SELECT '${user}', 'doc-' || n * 19, CASE WHEN n % 3 = 0 THEN 'edit' ELSE 'view' END
    FROM generate_series(1, 50000) n`);

  yield* sql.unsafe("ANALYZE");
}).pipe(Effect.orDie);

const sampledIds = Array.from({ length: 1_000 }, (_, index) => `doc-${index * 997 + 1}`);

const sample = Effect.flatMap(Database, (database) =>
  database.select().from(documents).where(inArray(documents.id, sampledIds)).pipe(Effect.orDie),
);

const page = (list: "visible" | "editable") =>
  Effect.flatMap(Documents, (store) => store[list]({ limit: 100, offset: 0 }));

const visibleCount = Effect.gen(function* () {
  const database = yield* Database;
  const condition = yield* ViewDocumentFilter.condition;

  return yield* database
    .select({ total: count() })
    .from(documents)
    .where(Drizzle.where(documents, condition))
    .pipe(Effect.orDie);
});

const checkEach = (sampled: ReadonlyArray<Document>) =>
  Effect.forEach(sampled, (each) => ViewDocument.check(each), { discard: true });

// Counts the SQL statements an effect runs: each runs in a span of kind client.
const statements = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.suspend(() => {
    let counted = 0;

    const tracer = Tracer.make({
      span: (options) => {
        if (options.kind === "client") counted += 1;

        return new Tracer.NativeSpan(options);
      },
    });

    return Effect.map(Effect.withTracer(effect, tracer), () => counted);
  });

const plan = Effect.gen(function* () {
  const database = yield* Database;
  const condition = yield* ViewDocumentFilter.condition;

  const query = database
    .select({ id: documents.id })
    .from(documents)
    .where(Drizzle.where(documents, condition))
    .orderBy(documents.id)
    .limit(100)
    .toSQL();

  const rows = yield* database.$client
    .unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${query.sql}`, query.params)
    .pipe(Effect.orDie);

  return rows.map((row) => Object.values(row).join("")).join("\n");
});

let sampled: ReadonlyArray<Document> = [];

beforeAll(async () => {
  await runtime.runPromise(seed);
  sampled = await runtime.runPromise(sample);
}, 600_000);

afterAll(() => runtime.dispose());

test("statements each operation runs", async () => {
  const counts = await run(
    Effect.all({
      "view condition": statements(ViewDocumentFilter.condition),
      "edit condition": statements(EditDocumentFilter.condition),
      "delete condition": statements(DeleteDocumentFilter.condition),
      "page of 100 visible": statements(page("visible")),
      "page of 100 editable": statements(page("editable")),
      "counting visible": statements(visibleCount),
      [`checking ${sampledIds.length} documents one by one`]: statements(checkEach(sampled)),
    }),
  );

  console.table(counts);
});

test("building conditions", async ({ bench }) => {
  await bench.compare(
    bench("view condition", () => run(ViewDocumentFilter.condition)),
    bench("edit condition, on the view condition", () => run(EditDocumentFilter.condition)),
    bench("delete condition, on the edit condition", () => run(DeleteDocumentFilter.condition)),
    { iterations: 20 },
  );
});

test(`listing from ${scale.toLocaleString("en")} documents without an index`, async ({ bench }) => {
  console.log(`\nQuery plan without an index:\n${await run(plan)}`);

  await bench.compare(
    bench("page of 100 visible", () => run(page("visible"))),
    bench("page of 100 editable", () => run(page("editable"))),
    bench("counting visible", () => run(visibleCount)),
    { iterations: 10 },
  );
});

test(`checking ${sampledIds.length} documents one by one`, async ({ bench }) => {
  await bench("checking each", () => run(checkEach(sampled))).run({ iterations: 5 });
});

test(`listing from ${scale.toLocaleString("en")} documents with an index on org_id`, async ({
  bench,
}) => {
  await runtime.runPromise(
    Effect.flatMap(Database, ({ $client: sql }) =>
      Effect.andThen(
        sql.unsafe("CREATE INDEX documents_org_id ON documents (org_id)"),
        sql.unsafe("ANALYZE documents"),
      ),
    ).pipe(Effect.orDie),
  );

  console.log(`\nQuery plan with an index on org_id:\n${await run(plan)}`);

  await bench.compare(
    bench("page of 100 visible", () => run(page("visible"))),
    bench("page of 100 editable", () => run(page("editable"))),
    bench("counting visible", () => run(visibleCount)),
    { iterations: 10 },
  );
});

const depth = 100_000;

test(`fetching the page after ${depth.toLocaleString("en")} visible documents`, async ({
  bench,
}) => {
  // The id the page starts after, as a client would hold it from the previous page.
  const cursor = await run(
    Effect.gen(function* () {
      const database = yield* Database;
      const condition = yield* ViewDocumentFilter.condition;

      const [row] = yield* database
        .select({ id: documents.id })
        .from(documents)
        .where(Drizzle.where(documents, condition))
        .orderBy(documents.id)
        .offset(depth - 1)
        .limit(1)
        .pipe(Effect.orDie);

      return row?.id;
    }),
  );

  await bench.compare(
    bench("first page", () =>
      run(Effect.flatMap(Documents, (store) => store.visibleAfter(undefined, 100)))),
    bench("by offset", () =>
      run(Effect.flatMap(Documents, (store) => store.visible({ limit: 100, offset: depth })))),
    bench("by cursor", () =>
      run(Effect.flatMap(Documents, (store) => store.visibleAfter(cursor, 100)))),
    { iterations: 10 },
  );
});
