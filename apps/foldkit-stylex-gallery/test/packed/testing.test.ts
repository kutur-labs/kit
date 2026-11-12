import type { tokenContrast } from "@kutur-kit/foldkit-stylex-theme/testing";
// The packed testing modules as a Playwright test uses them: the dist's audit, recordMotion and
// tokenContrast, sent as source to the consumer's built app. A function that reaches outside its
// body, such as to an import its build added, throws in the page.
import type { audit, recordMotion } from "@kutur-kit/foldkit-stylex/testing";

import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { Predicate, Schema } from "effect";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { loadServerEntry, serve } from "../serve.ts";
import { succeed } from "./run.ts";

const consumer = inject("consumer");

// The dist is plain JavaScript, so this checks each export is a function and trusts the packed
// declarations, which types.test.ts checks, for its signature.
const isAudit = (input: unknown): input is typeof audit => Predicate.isFunction(input);

const isRecordMotion = (input: unknown): input is typeof recordMotion =>
  Predicate.isFunction(input);

const isTokenContrast = (input: unknown): input is typeof tokenContrast =>
  Predicate.isFunction(input);

const CoreTesting = Schema.Struct({
  audit: Schema.declare(isAudit),
  recordMotion: Schema.declare(isRecordMotion),
});

const ThemeTesting = Schema.Struct({ tokenContrast: Schema.declare(isTokenContrast) });

const testingDist = (name: string) =>
  pathToFileURL(join(consumer, "node_modules", name, "dist/testing.js")).href;

const core = Schema.decodeUnknownSync(CoreTesting)(
  await import(testingDist("@kutur-kit/foldkit-stylex")),
);

const theme = Schema.decodeUnknownSync(ThemeTesting)(
  await import(testingDist("@kutur-kit/foldkit-stylex-theme")),
);

let browser: Browser | undefined;

let app: Readonly<{ url: string; close: () => Promise<void> }> | undefined;

beforeAll(async () => {
  await succeed(
    process.execPath,
    [
      join(consumer, "node_modules/vite/bin/vite.js"),
      "build",
      "--config",
      "vite.testing.config.ts",
    ],
    consumer,
  );
  app = await serve(
    await loadServerEntry(pathToFileURL(join(consumer, "dist-testing/server/fetch.js"))),
    pathToFileURL(join(consumer, "dist-testing/client/")),
  );
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

// The app under reduced motion, with the motion recorder in place before its scripts run, once
// Foldkit has hydrated it.
const openApp = async (): Promise<Page> => {
  if (browser === undefined || app === undefined) throw new Error("The app did not start.");
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(core.recordMotion);
  await page.goto(app.url);
  // Foldkit removes the marker as it hydrates.
  await page.waitForFunction(() => document.querySelector("[data-foldkit-app]") === null);

  return page;
};

describe("the packed testing modules, sent to a built app's page", () => {
  it("audit, after recordMotion, finds nothing in the themed popover, open under reduced motion", async () => {
    const page = await openApp();
    await page.getByRole("button", { name: "Details" }).click();
    await page.locator("#plain-panel").waitFor();

    expect(await page.evaluate(core.audit, { root: "main" })).toEqual([]);
  });

  it("tokenContrast passes the theme's colors and reports a preset's muted text", async () => {
    const page = await openApp();

    const findings = await page.evaluate(theme.tokenContrast, {
      preset: { "--fks-color-muted": "light-dark(#a1a1aa, #52525b)" },
    });

    expect(await page.evaluate(theme.tokenContrast, {})).toEqual([]);
    expect(findings.map(({ rule, at }) => `${rule}: ${at}`)).toEqual([
      "contrast: color.muted on color.surface",
      "contrast: color.muted on color.surface",
      "contrast: color.muted on color.subtle",
      "contrast: color.muted on color.subtle",
    ]);
  });
});
