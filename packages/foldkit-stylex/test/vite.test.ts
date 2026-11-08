// @vitest-environment node
// foldkitStylex() runs StyleX's Vite plugin in dev and build and its Rollup plugin under Vitest,
// keeping StyleX's own `apply`, which turns StyleX off in dev for devMode "off". It passes StyleX
// the app's options with its own added.
import type { ConfigEnv, Plugin } from "vite";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { build, resolveConfig } from "vite";
import { describe, expect, it } from "vitest";

import { foldkitStylex } from "../src/vite.ts";

const dev: ConfigEnv = { command: "serve", mode: "development" };

const vitest: ConfigEnv = { command: "serve", mode: "test" };

const production: ConfigEnv = { command: "build", mode: "production" };

const applies = (plugin: Plugin | undefined, env: ConfigEnv) =>
  Predicate.isFunction(plugin?.apply) ? plugin.apply({}, env) : undefined;

// The Lightningcss that StyleX's plugin runs, whose feature flags its options take.
const { Features } = Schema.decodeUnknownSync(
  Schema.Struct({ Features: Schema.Struct({ OklabColors: Schema.Int }) }),
)(createRequire(import.meta.resolve("@stylexjs/unplugin"))("lightningcss"));

// The CSS a production build of test/app writes, without whitespace.
const builtCss = async (plugins: Array<Plugin>) => {
  const bundle = await build({
    configFile: false,
    logLevel: "silent",
    root: fileURLToPath(new URL("app/", import.meta.url)),
    build: { write: false },
    plugins,
  });

  if (!("output" in bundle)) throw new Error("The build of test/app returned no single output.");

  return bundle.output
    .flatMap((file) =>
      file.type === "asset" && file.fileName.endsWith(".css") && Predicate.isString(file.source)
        ? [file.source]
        : [],
    )
    .join("")
    .replaceAll(/\s/g, "");
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

  // Chrome 80 has neither inset, oklch() nor light-dark(). Its targets expand inset; the app's
  // exclude keeps oklch() and the package's keeps light-dark().
  it("passes the app's Lightningcss options with its own exclusion of light-dark()", async () => {
    const css = await builtCss(
      foldkitStylex({
        lightningcssOptions: { targets: { chrome: 80 << 16 }, exclude: Features.OklabColors },
      }),
    );

    expect(css).toContain("{top:0;bottom:0;left:0;right:0;");
    expect(css).toContain("{background-color:oklch(");
    expect(css).toContain("{color:light-dark(");
  });
});
