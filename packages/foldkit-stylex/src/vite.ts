import type { UserOptions } from "@stylexjs/unplugin";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

import { createRequire } from "node:module";

import { unplugin } from "@stylexjs/unplugin";
import * as Predicate from "effect/Predicate";

/** StyleX's options. `externalPackages` is read by @stylexjs/unplugin but missing from its type. */
export type Options = Partial<UserOptions> & Readonly<{ externalPackages?: ReadonlyArray<string> }>;

// The factories' declarations return `any`; these name the plugin they return. The named
// `unplugin` export types the same under NodeNext as at runtime, unlike the `/vite` default.
const vite: (options: Options) => Plugin = unplugin.vite;

const rollup: (options: Options) => Plugin = unplugin.rollup;

// SAFETY: require returns any. This is the Lightningcss that StyleX's plugin runs, so its feature
// flags match the transform they configure, and neither the app nor this package installs another.
const { Features } = createRequire(import.meta.resolve("@stylexjs/unplugin"))(
  "lightningcss",
) as Readonly<{
  Features: Readonly<{ LightDark: number }>;
}>;

// Both ship `stylex.create` for the app's compiler. Listing one that is not installed is harmless.
const packages = ["@kutur-kit/foldkit-stylex", "@kutur-kit/foldkit-stylex-theme"];

type When = (config: UserConfig, env: ConfigEnv) => boolean;

// Vitest runs Vite in mode "test". The Vite entry's dev CSS polling keeps Vitest alive until its
// teardown timeout; the Rollup entry compiles the same way and has no dev server hook.
const inTests: When = (_config, env) => env.mode === "test";

// Narrows a plugin to `when`, keeping its own `apply`: StyleX's turns it off in dev for devMode "off".
const applied = (plugin: Plugin, when: When): Plugin => ({
  ...plugin,
  apply: (config, env) =>
    when(config, env) &&
    (Predicate.isFunction(plugin.apply)
      ? plugin.apply(config, env)
      : (plugin.apply ?? env.command) === env.command),
});

// StyleX appends its rules to the client's CSS file. With none, it writes an assets/stylex.css
// that no page links, and the production site renders unstyled.
const requireClientCss: Plugin = {
  name: "@kutur-kit/foldkit-stylex:client-css",
  apply: "build",
  generateBundle(_options, bundle) {
    if (
      this.environment.config.consumer === "client" &&
      !Object.keys(bundle).some((fileName) => fileName.endsWith(".css"))
    ) {
      this.error(
        "Import a CSS file from the client entry or link one from index.html, even an empty one. StyleX appends its rules, this package's included, to that file; without one, the pages link no StyleX CSS.",
      );
    }
  },
};

/**
 * StyleX for a Foldkit app that uses @kutur-kit/foldkit-stylex, in dev, build and Vitest. Use it in
 * place of `@stylexjs/unplugin/vite`, in vite.config.ts and vitest.config.ts; it takes the same options.
 */
// Vite takes a mutable array of plugins.
export const foldkitStylex = (options: Options = {}): Array<Plugin> => {
  const configured: Options = {
    ...options,
    // StyleX finds packages to compile from node_modules only through the package.json nearest
    // the working directory, and only those that export ./package.json. Alchemy's dev server runs
    // from the repository root, and Vite then pre-bundles these packages uncompiled.
    externalPackages: [...packages, ...(options.externalPackages ?? [])],
    lightningcssOptions: {
      ...options.lightningcssOptions,
      // Under default browser targets Lightningcss rewrites light-dark() into variables that only
      // a color-scheme declaration in StyleX's own CSS sets, which leaves those colors invalid.
      exclude: (options.lightningcssOptions?.exclude ?? 0) | Features.LightDark,
    },
  };

  return [
    applied(vite(configured), (config, env) => !inTests(config, env)),
    applied(rollup(configured), inTests),
    {
      name: "@kutur-kit/foldkit-stylex:ssr",
      // Server rendering and Vitest must load them through Vite, which compiles their styles. The
      // theme has no foldkit peer, so Foldkit's plugin does not add it.
      config: () => ({ ssr: { noExternal: packages } }),
    },
    requireClientCss,
  ];
};
