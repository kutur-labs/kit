import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { findCatalogViolations } from "../pnpmfile.mjs";

type Versions = Readonly<Record<string, string>>;

type PackageJson = {
  readonly name: string;
  readonly dependencies?: Versions;
  readonly devDependencies?: Versions;
  readonly optionalDependencies?: Versions;
  readonly peerDependencies?: Versions;
};

const pnpmfile = fileURLToPath(new URL("../pnpmfile.mjs", import.meta.url));

// pnpm wraps errors at 80 columns, even inside words, so compare text without
// whitespace.
const squash = (text: string) => text.replace(/\s+/g, "");

// Installs a temporary workspace that loads the hook. Accepted workspaces
// declare no registry dependencies, so `--offline` keeps them off the network.
const install = (workspace: string, files: Readonly<Record<string, PackageJson>>) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-strict-"));

  try {
    writeFileSync(
      join(directory, "pnpm-workspace.yaml"),
      `${workspace}\npnpmfile:\n  - ${JSON.stringify(pnpmfile)}\nautoInstallPeers: false\n`,
    );

    for (const [path, manifest] of Object.entries(files)) {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), JSON.stringify(manifest));
    }

    const result = spawnSync("pnpm", ["install", "--offline"], {
      cwd: directory,
      encoding: "utf8",
    });

    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const reports = (output: string, problem: string) =>
  squash(output).split(squash(`- ${problem}`)).length - 1;

const outsideCatalogs = (dependency: string) =>
  `${dependency}. Versions outside the catalogs can differ between packages. Fix: use \`catalog:\` or \`workspace:\`.`;

const looseCatalogEntry = (entry: string) =>
  `pnpm-workspace.yaml: ${entry}. A range or tag lets the installed version move without an edit to this entry. Fix: replace it with an exact version, such as the one in \`pnpm-lock.yaml\`.`;

const looseExclusion = (entry: string) =>
  `pnpm-workspace.yaml: minimumReleaseAgeExclude has "${entry}". A name pattern also exempts other packages, and a bare name, range or tag also exempts versions published later. Fix: list one package name with exact versions, as \`name@1.2.3\` or \`name@1.2.3 || 1.2.4\`.`;

const pruneOff =
  "pnpm-workspace.yaml: minimumReleaseAgeExcludePrune is not true. pnpm adds exclusions on its own and keeps them after the lockfile drops those versions. Fix: set `minimumReleaseAgeExcludePrune: true`.";

await test("rejects versions that bypass the catalogs in every pinned field", () => {
  const { status, output } = install("packages:\n  - packages/*", {
    "package.json": { name: "root", devDependencies: { typescript: "7.0.0" } },
    "packages/a/package.json": {
      name: "a",
      dependencies: { "is-number": "^7.0.0" },
      optionalDependencies: { fsevents: "latest" },
    },
  });

  assert.notEqual(status, 0, output);

  for (const dependency of [
    'package.json: devDependencies.typescript is "7.0.0"',
    'packages/a/package.json: dependencies.is-number is "^7.0.0"',
    'packages/a/package.json: optionalDependencies.fsevents is "latest"',
  ]) {
    assert.equal(reports(output, outsideCatalogs(dependency)), 1, output);
  }
});

await test("rejects loose catalog entries that a non-peer field uses, once each", () => {
  const { status, output } = install(
    "packages:\n  - packages/*\ncatalog:\n  left-pad: ^1.3.0\ncatalogs:\n  peers:\n    effect: ^4.0.0",
    {
      "package.json": { name: "root" },
      "packages/a/package.json": { name: "a", dependencies: { "left-pad": "catalog:" } },
      "packages/b/package.json": {
        name: "b",
        devDependencies: { "left-pad": "catalog:", effect: "catalog:peers" },
        peerDependencies: { effect: "catalog:peers" },
      },
    },
  );

  assert.notEqual(status, 0, output);

  for (const entry of [
    'catalogs.default.left-pad is "^1.3.0"',
    'catalogs.peers.effect is "^4.0.0"',
  ]) {
    assert.equal(reports(output, looseCatalogEntry(entry)), 1, output);
  }
});

await test("accepts workspace links, peer ranges and manifests outside the workspace", () => {
  const loose = { dependencies: { "is-number": "^7.0.0" } };

  const { status, output } = install(
    'packages:\n  - packages/**\n  - "!packages/ignored"\ncatalogs:\n  peers:\n    effect: ^4.0.0\nminimumReleaseAgeExcludePrune: true',
    {
      "package.json": { name: "root" },
      "packages/a/package.json": {
        name: "a",
        dependencies: { b: "workspace:*" },
        peerDependencies: { effect: "catalog:peers", zod: "^4.0.0" },
      },
      "packages/b/package.json": { name: "b" },
      "packages/ignored/package.json": { name: "ignored", ...loose },
      "packages/b/node_modules/installed/package.json": { name: "installed", ...loose },
    },
  );

  assert.equal(status, 0, output);
});

await test("treats only exact versions and exact npm aliases as pinned", () => {
  const usingUi = [{ path: "package.json", manifest: { dependencies: { ui: "catalog:" } } }];

  const pinned = (version: string) =>
    findCatalogViolations({ default: { ui: version } }, usingUi).length === 0;

  for (const version of [
    "1.2.3",
    "1.0.0-rc.5",
    "0.22.0-ts7.1.0-beta",
    "1.2.3+build.7",
    "npm:@scope/ui@16.18.1",
    "npm:ui@1.2.3",
  ]) {
    assert.ok(pinned(version), version);
  }

  for (const version of [
    "^1.2.3",
    "~1.2.3",
    "1.2",
    "1.2.x",
    ">=1.2.3",
    "1.2.3 - 1.4.0",
    "1.2.3 || 2.0.0",
    "v1.2.3",
    "latest",
    "*",
    "npm:@scope/ui",
    "npm:@scope/ui@^16.18.1",
  ]) {
    assert.ok(!pinned(version), version);
  }
});

await test("rejects name patterns and loose versions in release-age exclusions, with the catalog problems", () => {
  const entries = [
    "oxfmt",
    "@oxfmt/*",
    "@oxfmt/*@0.77.0",
    "!not-this-package@7.0.0",
    "is-numbe?@7.0.0",
    "is-number@^7.0.0",
    "left-pad@latest",
    "fsevents@2.3.3 || ^2.4.0",
  ];

  const { status, output } = install(
    `minimumReleaseAgeExclude:\n${entries.map((entry) => `  - ${JSON.stringify(entry)}`).join("\n")}\nminimumReleaseAgeExcludePrune: false`,
    { "package.json": { name: "root", devDependencies: { typescript: "7.0.0" } } },
  );

  assert.notEqual(status, 0, output);

  for (const problem of [
    outsideCatalogs('package.json: devDependencies.typescript is "7.0.0"'),
    ...entries.map(looseExclusion),
    pruneOff,
  ]) {
    assert.equal(reports(output, problem), 1, output);
  }
});

await test("requires pruning release-age exclusions when the setting is unset", () => {
  const { status, output } = install("", { "package.json": { name: "root" } });

  assert.notEqual(status, 0, output);
  assert.equal(reports(output, pruneOff), 1, output);
});

await test("accepts exact release-age exclusions, including scoped and capitalized names and version lists", () => {
  const { status, output } = install(
    'minimumReleaseAgeExclude:\n  - oxfmt@0.77.0\n  - "@distilled.cloud/aws@1.0.0-rc.18"\n  - JSONStream@1.3.5\n  - "is-number@6.0.0 || 7.0.0"\nminimumReleaseAgeExcludePrune: true',
    { "package.json": { name: "root" } },
  );

  assert.equal(status, 0, output);
});

await test("does not check overrides yet", () => {
  const { status, output } = install(
    "overrides:\n  is-number: ^7.0.0\nminimumReleaseAgeExcludePrune: true",
    { "package.json": { name: "root" } },
  );

  assert.equal(status, 0, output);
});
