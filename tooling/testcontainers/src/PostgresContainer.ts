import * as PgClient from "@effect/sql-pg/PgClient";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";

export const image =
  "postgres:18.6-alpine3.24@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873";

/** A PostgreSQL server for tests, reached through its connection URL. */
export class PostgresContainer extends Context.Service<
  PostgresContainer,
  { readonly url: Redacted.Redacted<string> }
>()("@kutur-kit/testcontainers/PostgresContainer") {
  /**
   * Uses `TEST_POSTGRES_URL` when set, such as a CI service. Otherwise reuses
   * the container every process of every run shares, starting it if needed.
   * `TESTCONTAINERS_REUSE_ENABLE=false` gives the scope its own container.
   */
  static readonly layer = Layer.effect(
    PostgresContainer,
    Effect.gen(function* () {
      const configured = yield* Effect.orDie(Config.option(Config.Redacted("TEST_POSTGRES_URL")));

      if (Option.isSome(configured)) return { url: configured.value };

      const reuse = yield* Effect.orDie(
        Config.Boolean("TESTCONTAINERS_REUSE_ENABLE").pipe(Config.withDefault(true)),
      );

      // Other processes, such as Stryker's workers, may still use a shared container.
      const container = yield* Effect.acquireRelease(
        Effect.promise(() => new PostgreSqlContainer(image).withReuse().start()),
        (started) => (reuse ? Effect.void : Effect.promise(() => started.stop())),
      );

      return { url: Redacted.make(container.getConnectionUri()) };
    }),
  );
}

/**
 * Creates an empty database on the server and drops it when the scope closes,
 * so tests sharing one server stay isolated.
 */
export const database = Effect.gen(function* () {
  const { url } = yield* PostgresContainer;
  const admin = yield* PgClient.make({ url }).pipe(Effect.provide(Reactivity.layer));
  const name = `test_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;

  yield* admin.unsafe(`CREATE DATABASE "${name}"`);
  yield* Effect.addFinalizer(() =>
    Effect.ignore(admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)),
  );

  const created = new URL(Redacted.value(url));
  created.pathname = `/${name}`;

  return Redacted.make(created.toString());
});
