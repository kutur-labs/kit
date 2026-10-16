import * as PgClient from "@effect/sql-pg/PgClient";
import { it } from "@effect/vitest";
import { Effect, Redacted } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { expect } from "vitest";

import { database, PostgresContainer } from "../src/PostgresContainer.ts";
import { postgres } from "../src/vitest.ts";

const connect = (url: Redacted.Redacted<string>) =>
  PgClient.make({ url }).pipe(Effect.provide(Reactivity.layer));

const name = (url: Redacted.Redacted<string>) => new URL(Redacted.value(url)).pathname.slice(1);

it.effect("gives each scope its own empty database and drops it when the scope closes", () =>
  Effect.gen(function* () {
    const [first, second] = yield* Effect.scoped(
      Effect.gen(function* () {
        const [first, second] = [yield* database, yield* database];
        const client = yield* connect(first);

        yield* client.unsafe("CREATE TABLE notes (id text)");

        const tables = yield* (yield* connect(second)).unsafe(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        );

        expect(tables).toEqual([]);

        return [name(first), name(second)];
      }),
    );

    const server = yield* connect((yield* PostgresContainer).url);

    const remaining = yield* server.unsafe(
      "SELECT datname FROM pg_database WHERE datname IN ($1, $2)",
      [first, second],
    );

    expect(first).not.toBe(second);
    expect(remaining).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(postgres)),
);
