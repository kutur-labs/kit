// Packs the core and the theme as they would publish, and installs them with their peers into an
// app outside the workspace: exact versions from kit's catalogs, strict peers, the pnpm store
// first. The test files then build, serve and test that app.
import type { TestProject } from "vitest/node";

import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { type Catalog, readCatalogs } from "../catalogs.ts";
import { succeed } from "./run.ts";

declare module "vitest" {
  export interface ProvidedContext {
    /** The installed app: a copy of consumer/, demos linked in, in a temporary directory. */
    consumer: string;
  }
}

const kit = fileURLToPath(new URL("../../../../", import.meta.url));

const pinned = (catalog: typeof Catalog.Type, names: ReadonlyArray<string>) =>
  Object.fromEntries(
    names.map((name) => {
      const version = catalog[name];

      if (version === undefined) throw new Error(`Kit's catalogs pin no version of ${name}.`);

      return [name, version];
    }),
  );

export default async function setup(project: TestProject) {
  const root = await mkdtemp(join(tmpdir(), "foldkit-stylex-packed-"));
  const tarballs = join(root, "tarballs");
  const consumer = join(root, "consumer");

  // pnpm pack applies publishConfig and turns workspace and catalog ranges into versions.
  for (const name of ["foldkit-stylex", "foldkit-stylex-theme"]) {
    await succeed("pnpm", ["pack", "--pack-destination", tarballs], join(kit, "packages", name));
  }

  const [core, theme] = (await readdir(tarballs)).sort().map((file) => join(tarballs, file));

  if (core === undefined || theme === undefined) {
    throw new Error(`pnpm pack wrote no tarballs to ${tarballs}.`);
  }

  const catalogs = readCatalogs();

  // The links under src/ become copies of the files they point at, such as the gallery's demos.
  await cp(new URL("../../consumer/", import.meta.url), consumer, {
    recursive: true,
    dereference: true,
  });
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "consumer",
      private: true,
      type: "module",
      dependencies: {
        ...pinned(catalogs.runtime, [
          "@effect/platform-browser",
          "@foldkit/ui",
          "@stylexjs/stylex",
          "effect",
          "foldkit",
        ]),
        "@kutur-kit/foldkit-stylex": `file:${core}`,
        "@kutur-kit/foldkit-stylex-theme": `file:${theme}`,
      },
      devDependencies: {
        ...pinned(catalogs.tooling, [
          "@foldkit/vite-plugin",
          "@stylexjs/unplugin",
          "tsrs",
          "unplugin",
          "vite",
        ]),
        ...pinned(catalogs.testing, [
          "@vitest/browser-playwright",
          "happy-dom",
          "playwright",
          "vitest",
        ]),
      },
    }),
  );
  // An app's own settings: no peer installed for it, and a missing or mismatched peer fails. As
  // in kit's workspace, redis is ignored: @foldkit/vite-plugin's @effect/platform-node requires it
  // for its NodeRedis module alone. @foldkit/vite-plugin takes any 4.1 patch of the two
  // @effect/platform-node packages, and each patch requires effect at that patch or later. Effect
  // releases its packages together, so the app holds them at the effect it installs.
  const { effect } = pinned(catalogs.runtime, ["effect"]);

  await writeFile(
    join(consumer, "pnpm-workspace.yaml"),
    [
      "autoInstallPeers: false",
      "strictPeerDependencies: true",
      "peerDependencyRules:",
      "  ignoreMissing:",
      "    - redis",
      "overrides:",
      `  "@effect/platform-node": ${effect}`,
      `  "@effect/platform-node-shared": ${effect}`,
      "allowBuilds:",
      "  esbuild: true",
      "",
    ].join("\n"),
  );
  await succeed("pnpm", ["install", "--prefer-offline"], consumer);

  project.provide("consumer", consumer);

  return () => rm(root, { recursive: true, force: true });
}
