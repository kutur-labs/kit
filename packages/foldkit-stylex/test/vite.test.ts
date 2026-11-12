// @vitest-environment node
// foldkitStylex() runs StyleX's Vite plugin in dev and build and its Rollup plugin under Vitest,
// keeping StyleX's own `apply`, which turns StyleX off in dev for devMode "off". It passes StyleX
// the app's options with its own added.
import type { ConfigEnv, Plugin } from "vite";

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { build, resolveConfig } from "vite";
import { describe, expect, it, onTestFinished } from "vitest";

import { foldkitStylex, type Options } from "../src/vite.ts";

const dev: ConfigEnv = { command: "serve", mode: "development" };

const vitest: ConfigEnv = { command: "serve", mode: "test" };

const production: ConfigEnv = { command: "build", mode: "production" };

const applies = (plugin: Plugin | undefined, env: ConfigEnv) =>
  Predicate.isFunction(plugin?.apply) ? plugin.apply({}, env) : undefined;

// The Lightningcss that StyleX's plugin runs, whose feature flags its options take.
const { Features } = Schema.decodeUnknownSync(
  Schema.Struct({ Features: Schema.Struct({ OklabColors: Schema.Int }) }),
)(createRequire(import.meta.resolve("@stylexjs/unplugin"))("lightningcss"));

// The CSS and the JavaScript a build of test/app writes, in production unless `mode` says
// otherwise, without whitespace.
const built = async (plugins: Array<Plugin>, mode = "production") => {
  const bundle = await build({
    configFile: false,
    logLevel: "silent",
    mode,
    root: fileURLToPath(new URL("app/", import.meta.url)),
    build: { write: false },
    plugins,
  });

  if (!("output" in bundle)) throw new Error("The build of test/app returned no single output.");

  const joined = (files: ReadonlyArray<string>) => files.join("").replaceAll(/\s/g, "");

  return {
    css: joined(
      bundle.output.flatMap((file) =>
        file.type === "asset" && file.fileName.endsWith(".css") && Predicate.isString(file.source)
          ? [file.source]
          : [],
      ),
    ),
    js: joined(bundle.output.flatMap((file) => (file.type === "chunk" ? [file.code] : []))),
  };
};

describe("foldkitStylex", () => {
  const [vite, rollup] = foldkitStylex();

  for (const [name, env, expected] of [
    ["dev", dev, { vite: true, rollup: false }],
    ["Vitest", vitest, { vite: false, rollup: true }],
    ["build", production, { vite: true, rollup: false }],
  ] as const) {
    it(`applies one StyleX plugin in ${name}`, () => {
      expect({ vite: applies(vite, env), rollup: applies(rollup, env) }).toEqual(expected);
    });
  }

  it('keeps StyleX off in dev with devMode "off"', () => {
    const [offVite, offRollup] = foldkitStylex({ devMode: "off" });

    expect({ vite: applies(offVite, dev), rollup: applies(offRollup, dev) }).toEqual({
      vite: false,
      rollup: false,
    });
  });

  it("loads both packages through Vite for server rendering and Vitest", async () => {
    const config = await resolveConfig({ configFile: false, plugins: foldkitStylex() }, "serve");

    expect(config.ssr.noExternal).toEqual(
      expect.arrayContaining(["@kutur-kit/foldkit-stylex", "@kutur-kit/foldkit-stylex-theme"]),
    );
  });

  // Under Vitest the compiled modules insert their CSS through this module, which Vite would
  // otherwise find mid-run and reload the tests for. test/app/checkbox-audit.ts sees the CSS.
  it("pre-bundles StyleX's style injection under Vitest alone", async () => {
    const included = async (mode: string) =>
      (await resolveConfig({ configFile: false, mode, plugins: foldkitStylex() }, "serve"))
        .optimizeDeps.include ?? [];

    expect({ vitest: await included("test"), dev: await included("development") }).toEqual({
      vitest: ["@stylexjs/stylex/lib/stylex-inject"],
      dev: [],
    });
  });

  // A build in mode "test" applies the plugins Vitest runs. Its CSS cannot tell the two apart: it
  // may hold rules that StyleX collected in an earlier build of the process.
  it("lets the app turn runtimeInjection off under Vitest", async () => {
    const injects = async (options?: Options) =>
      (await built(foldkitStylex(options), "test")).js.includes("{inset:0}");

    expect({ byDefault: await injects(), off: await injects({ runtimeInjection: false }) }).toEqual(
      { byDefault: true, off: false },
    );
  });

  // StyleX's Vite plugin keeps the packages it compiles out of dependency pre-bundling.
  it("compiles the app's externalPackages along with both packages", async () => {
    const config = await resolveConfig(
      { configFile: false, plugins: foldkitStylex({ externalPackages: ["@acme/tokens"] }) },
      "serve",
    );

    expect(config.optimizeDeps.exclude).toEqual(
      expect.arrayContaining([
        "@kutur-kit/foldkit-stylex",
        "@kutur-kit/foldkit-stylex-theme",
        "@acme/tokens",
      ]),
    );
  });

  // Pre-bundling would bundle an installed copy uncompiled. Vite serves a linked one as source,
  // and excluding it would hide its imports from the dependency scan, which reloads the tests.
  it("keeps installed packages alone out of pre-bundling under Vitest", async () => {
    const root = await mkdtemp(join(tmpdir(), "foldkit-stylex-vite-"));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    // Like both packages, neither exports ./package.json.
    const manifest = (name: string) => JSON.stringify({ name, exports: { ".": "./index.js" } });
    await mkdir(join(root, "node_modules/@acme/tokens"), { recursive: true });
    await writeFile(join(root, "node_modules/@acme/tokens/package.json"), manifest("@acme/tokens"));
    await mkdir(join(root, "linked"));
    await writeFile(join(root, "linked/package.json"), manifest("@acme/linked"));
    await symlink(join(root, "linked"), join(root, "node_modules/@acme/linked"));

    const config = await resolveConfig(
      {
        configFile: false,
        root,
        mode: "test",
        plugins: foldkitStylex({ externalPackages: ["@acme/tokens", "@acme/linked"] }),
      },
      "serve",
    );

    expect(config.optimizeDeps.exclude).toEqual(["@acme/tokens"]);
  });

  // Chrome 80 has neither inset, oklch() nor light-dark(). Its targets expand inset; the app's
  // exclude keeps oklch() and the package's keeps light-dark().
  it("passes the app's Lightningcss options with its own exclusion of light-dark()", async () => {
    const { css } = await built(
      foldkitStylex({
        lightningcssOptions: { targets: { chrome: 80 << 16 }, exclude: Features.OklabColors },
      }),
    );

    expect(css).toContain("{top:0;bottom:0;left:0;right:0;");
    expect(css).toContain("{background-color:oklch(");
    expect(css).toContain("{color:light-dark(");
  });
});
