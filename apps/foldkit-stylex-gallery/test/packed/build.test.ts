import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, inject, it } from "vitest";

import { loadServerEntry } from "../serve.ts";
import { run, succeed } from "./run.ts";

const consumer = inject("consumer");

const vite = join(consumer, "node_modules/vite/bin/vite.js");

const read = (path: string) => readFileSync(join(consumer, path), "utf8");

const filesIn = (pattern: string) => globSync(pattern, { cwd: consumer });

// The core's functional CSS: anchored panels sit above their open trigger.
const functionalRule = "z-index:10";

// StyleX appends its rules unminified, so assertions compare CSS without whitespace.
const cssAt = (path: string) => read(path).replaceAll(/\s/g, "");

const stylesheetsOf = (html: string) =>
  Array.from(
    html.matchAll(/<link rel="stylesheet"[^>]* href="([^"]+)"/g),
    ([, href]) => href ?? "",
  );

describe("vite build of an app that installed the packed packages", () => {
  it("compiles every StyleX call and links CSS that keeps light-dark()", async () => {
    await succeed(process.execPath, [vite, "build"], consumer);
    const bundles = [...filesIn("dist/client/**/*.js"), ...filesIn("dist/server/**/*.js")];
    const handler = await loadServerEntry(pathToFileURL(join(consumer, "dist/server/fetch.js")));

    const page = await handler.fetch(
      new Request("http://localhost/", { headers: { accept: "text/html" } }),
    );

    const css = stylesheetsOf(await page.text()).map((href) => cssAt(join("dist/client", href)));

    expect(bundles.filter((file) => /stylex\.(create|defineVars)\(/.test(read(file)))).toEqual([]);
    expect(css).toHaveLength(1);
    expect(css[0]).toContain(functionalRule);
    expect(css[0]).toContain("var(--fks-color-surface,light-dark(");
    expect(css[0]).not.toContain("var(--lightningcss");
  });

  it("fails when the client links no stylesheet, and says what to add", async () => {
    const { code, output } = await run(
      process.execPath,
      [vite, "build", "--config", "vite.without-css.config.ts"],
      consumer,
    );

    expect(code).not.toBe(0);
    expect(output).toContain(
      "Import a CSS file from the client entry or link one from index.html, even an empty one.",
    );
  });

  it("appends StyleX's rules to the stylesheet a single-page app links from index.html", async () => {
    await succeed(process.execPath, [vite, "build", "--config", "vite.spa.config.ts"], consumer);

    const css = stylesheetsOf(read("dist-spa/index.html")).map((href) =>
      cssAt(join("dist-spa", href)),
    );

    expect(css).toHaveLength(1);
    expect(css[0]).toContain(functionalRule);
  });
});
