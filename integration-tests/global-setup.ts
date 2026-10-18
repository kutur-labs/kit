import type { TestProject } from "vitest/node";

import { setupPostgres, setupRustfs } from "@kutur-kit/testcontainers/vitest";

/** One PostgreSQL and one S3-compatible server for the whole run. */
export default async (project: TestProject) => {
  const stops = await Promise.all([setupPostgres(project), setupRustfs(project)]);

  return async () => {
    await Promise.all(stops.map((stop) => stop()));
  };
};
