import type { UserOptions } from "@stylexjs/unplugin";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve, sep } from "node:path";

import { unplugin } from "@stylexjs/unplugin";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

/**
 * StyleX's options without `styleResolution`: the views' layer checks (src/internal/precedence.ts)
 * follow StyleX's default, property-specificity, where a longhand beats its shorthand whatever the
 * order. `externalPackages` is read by @stylexjs/unplugin but missing from its type.
 */
export type Options = Omit<Partial<UserOptions>, "styleResolution"> &
  Readonly<{ externalPackages?: ReadonlyArray<string> }>;

// The factories' declarations return `any`; these name the plugin they return. The named
// `unplugin` export types the same under NodeNext as at runtime, unlike the `/vite` default.
const vite: (options: Options) => Plugin = unplugin.vite;

const rollup: (options: Options) => Plugin = unplugin.rollup;

// The Lightningcss that StyleX's plugin runs, so its feature flags match the transform they
// configure; neither the app nor this package installs another.
const { Features } = Schema.decodeUnknownSync(
  Schema.Struct({ Features: Schema.Struct({ LightDark: Schema.Int }) }),
)(createRequire(import.meta.resolve("@stylexjs/unplugin"))("lightningcss"));

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

// The packages that Node finds from `root` in a node_modules directory, which Vite pre-bundles. A
// linked one, such as a workspace package, is a symlink to its source, which Vite serves as
// source already; excluding it would hide its imports from the dependency scan, which then finds
// them mid-run and reloads the tests. Directories, not exports: these packages export no
// ./package.json, and an app's may have no `require` condition.
const installedFrom = (root: string, names: ReadonlyArray<string>) => {
  const fromRoot = createRequire(join(root, "package.json"));

  return names.filter((name) => {
    const directory = (fromRoot.resolve.paths(name) ?? [])
      .map((modules) => join(modules, name))
      .find(existsSync);

    return directory !== undefined && realpathSync(directory).includes(`${sep}node_modules${sep}`);
  });
};

/**
 * StyleX for a Foldkit app that uses @kutur-kit/foldkit-stylex, in dev, build and Vitest. Use it in
 * place of `@stylexjs/unplugin/vite`, in vite.config.ts and vitest.config.ts; it takes the same
 * options except `styleResolution`. Under Vitest, `runtimeInjection` defaults to `true`, so
 * browser tests see the styles.
 */
// Vite takes a mutable array of plugins.
export const foldkitStylex = (options: Options = {}): Array<Plugin> => {
  // StyleX finds packages to compile from node_modules only through the package.json nearest the
  // working directory, and only those that export ./package.json. Alchemy's dev server runs from
  // the repository root, and Vite then pre-bundles these packages uncompiled.
  const externalPackages = [...packages, ...(options.externalPackages ?? [])];

  const configured: Options = {
    ...options,
    externalPackages,
    lightningcssOptions: {
      ...options.lightningcssOptions,
      // Under default browser targets Lightningcss rewrites light-dark() into variables that only
      // a color-scheme declaration in StyleX's own CSS sets, which leaves those colors invalid.
      exclude: (options.lightningcssOptions?.exclude ?? 0) | Features.LightDark,
    },
  };

  return [
    applied(vite(configured), (config, env) => !inTests(config, env)),
    // Vitest's dev server serves no stylesheet for StyleX to append to, so a browser test would
    // measure bare markup. The compiled modules insert their CSS when they load instead.
    applied(rollup({ runtimeInjection: true, ...configured }), inTests),
    {
      name: "@kutur-kit/foldkit-stylex:test-injection",
      apply: inTests,
      // Vite would otherwise find the module the injection imports mid-run, and reload the tests.
      // StyleX's Rollup entry, unlike its Vite one, leaves the packages it compiles to
      // pre-bundling, which would bundle an installed copy uncompiled.
      config: (config) => ({
        optimizeDeps: {
          include: ["@stylexjs/stylex/lib/stylex-inject"],
          exclude: installedFrom(resolve(config.root ?? ""), externalPackages),
        },
      }),
    },
    {
      name: "@kutur-kit/foldkit-stylex:ssr",
      // Server rendering and Vitest must load them through Vite, which compiles their styles. The
      // theme has no foldkit peer, so Foldkit's plugin does not add it.
      config: () => ({ ssr: { noExternal: packages } }),
    },
    requireClientCss,
  ];
};
