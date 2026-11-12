import { join } from "node:path";

import { describe, expect, inject, it } from "vitest";

import { run } from "./run.ts";

const consumer = inject("consumer");

const vitest = join(consumer, "node_modules/vitest/vitest.mjs");

describe("Vitest in an app that installed the packed packages", () => {
  it("passes with create-foldkit-app's config and foldkitStylex()", async () => {
    const { code, output } = await run(process.execPath, [vitest, "run"], consumer);

    expect(code, output).toBe(0);
  });

  it("audits the README's checkbox as styled in browser mode, with foldkitStylex() alone", async () => {
    const { code, output } = await run(
      process.execPath,
      [vitest, "run", "--config", "vitest.browser.config.ts"],
      consumer,
    );

    expect(code, output).toBe(0);
  });

  it("fails with the guard's message, which names the fix, without foldkitStylex()", async () => {
    const { code, output } = await run(
      process.execPath,
      [vitest, "run", "--config", "vitest.template.config.ts"],
      consumer,
    );

    expect(code).not.toBe(0);
    expect(output).toContain(
      'Add foldkitStylex() from "@kutur-kit/foldkit-stylex/vite" to the plugins of the config that ran it, vitest.config.ts included',
    );
  });
});
