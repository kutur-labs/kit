import type { TestProject } from "vitest/node";

import { Layer, ManagedRuntime, Redacted } from "effect";
import { inject } from "vitest";

import { PostgresContainer } from "./PostgresContainer.ts";
import { RustfsContainer } from "./RustfsContainer.ts";

declare module "vitest" {
  interface ProvidedContext {
    readonly postgresUrl: string;
    readonly rustfs: {
      readonly endpoint: string;
      readonly region: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
    };
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

/**
 * A Vitest `globalSetup` starting one S3-compatible server for the whole run.
 * Test files reach it through `rustfs`.
 */
export const setupRustfs = async (project: TestProject) => {
  const runtime = ManagedRuntime.make(RustfsContainer.layer);
  const server = await runtime.runPromise(RustfsContainer);

  project.provide("rustfs", {
    endpoint: server.endpoint,
    region: server.region,
    accessKeyId: Redacted.value(server.accessKeyId),
    secretAccessKey: Redacted.value(server.secretAccessKey),
  });

  return () => runtime.dispose();
};

/** The server `setupRustfs` started for this run. */
export const rustfs = Layer.sync(RustfsContainer, () => {
  const server = inject("rustfs");

  return {
    endpoint: server.endpoint,
    region: server.region,
    accessKeyId: Redacted.make(server.accessKeyId),
    secretAccessKey: Redacted.make(server.secretAccessKey),
  };
});
