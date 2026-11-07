// foldkitStylex() runs StyleX's Vite plugin in dev and build and its Rollup plugin under Vitest,
// keeping StyleX's own `apply`, which turns StyleX off in dev for devMode "off".
import type { ConfigEnv, Plugin } from "vite";

import * as Predicate from "effect/Predicate";
import { resolveConfig } from "vite";
import { describe, expect, it } from "vitest";

import { foldkitStylex } from "../src/vite.ts";

const dev: ConfigEnv = { command: "serve", mode: "development" };

const vitest: ConfigEnv = { command: "serve", mode: "test" };

const build: ConfigEnv = { command: "build", mode: "production" };

const applies = (plugin: Plugin | undefined, env: ConfigEnv) =>
  Predicate.isFunction(plugin?.apply) ? plugin.apply({}, env) : undefined;

describe("foldkitStylex", () => {
  const [vite, rollup] = foldkitStylex();

  for (const [name, env, expected] of [
    ["dev", dev, { vite: true, rollup: false }],
    ["Vitest", vitest, { vite: false, rollup: true }],
    ["build", build, { vite: true, rollup: false }],
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
});
