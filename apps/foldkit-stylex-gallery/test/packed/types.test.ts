import { join } from "node:path";

import { expect, inject, it } from "vitest";

import { run } from "./run.ts";

const consumer = inject("consumer");

it("type-checks the app, the gallery's demos included, against the packed declarations", async () => {
  const { code, output } = await run(
    process.execPath,
    [join(consumer, "node_modules/tsrs/bin/tsrs"), "-p", "tsconfig.json"],
    consumer,
  );

  expect(code, output).toBe(0);
});
