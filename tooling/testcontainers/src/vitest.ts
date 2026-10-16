import type { TestProject } from "vitest/node";

import { Layer, ManagedRuntime, Redacted } from "effect";
import { inject } from "vitest";

import { PostgresContainer } from "./PostgresContainer.ts";

declare module "vitest" {
  interface ProvidedContext {
    readonly postgresUrl: string;
  }
}

/**
 * A Vitest `globalSetup` starting one PostgreSQL server for the whole run.
 * Test files reach it through `postgres`.
 */
export const setupPostgres = async (project: TestProject) => {
  const runtime = ManagedRuntime.make(PostgresContainer.layer);
  const { url } = await runtime.runPromise(PostgresContainer);

  project.provide("postgresUrl", Redacted.value(url));

  return () => runtime.dispose();
};

/** The server `setupPostgres` started for this run. */
export const postgres = Layer.sync(PostgresContainer, () => ({
  url: Redacted.make(inject("postgresUrl")),
}));
