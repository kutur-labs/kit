// @ts-check
// pnpm loads this file before installing anything, so it can import only Node
// built-ins and pnpm rejects TypeScript pnpmfiles.
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {Readonly<Record<string, string>>} Versions
 * @typedef {Readonly<Record<string, Versions>>} Catalogs
 * @typedef {"dependencies" | "devDependencies" | "optionalDependencies"} PinnedField
 * @typedef {{ readonly path: string, readonly manifest: Readonly<Partial<Record<PinnedField, Versions>>> }} Manifest
 */

// Peer ranges tell consumers what they may install, so only these fields must
// resolve to one exact version.
/** @type {readonly PinnedField[]} */
const pinnedFields = ["dependencies", "devDependencies", "optionalDependencies"];

const exactVersion = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

/** @param {string} spec */
const isExact = (spec) =>
  exactVersion.test(spec.startsWith("npm:") ? spec.slice(spec.lastIndexOf("@") + 1) : spec);

/**
 * @param {Catalogs} catalogs
 * @param {string} path
 * @param {PinnedField} field
 * @param {[name: string, spec: string]} dependency
 */
const problemWith = (catalogs, path, field, [name, spec]) => {
  if (spec.startsWith("workspace:")) return undefined;

  if (!spec.startsWith("catalog:")) {
    return `${path}: ${field}.${name} is "${spec}"; use catalog: or workspace:`;
  }

  const catalog = spec.slice("catalog:".length) || "default";
  const version = catalogs[catalog]?.[name];

  return version === undefined || isExact(version)
    ? undefined
    : `pnpm-workspace.yaml: catalogs.${catalog}.${name} is "${version}"; use an exact version`;
};

/**
 * Lists versions that bypass the catalogs, and catalog entries that are not
 * exact although a non-peer dependency uses them.
 *
 * @param {Catalogs} catalogs
 * @param {readonly Manifest[]} manifests
 * @returns {string[]}
 */
export const findViolations = (catalogs, manifests) => {
  const problems = manifests.flatMap(({ path, manifest }) =>
    pinnedFields.flatMap((field) =>
      Object.entries(manifest[field] ?? {}).map((dependency) =>
        problemWith(catalogs, path, field, dependency),
      ),
    ),
  );

  // Each package using a loose catalog entry would report it again.
  return [...new Set(problems.filter((problem) => problem !== undefined))];
};

/** @param {string} root @param {readonly string[]} patterns */
const readManifests = (root, patterns) => {
  const included = patterns.filter((pattern) => !pattern.startsWith("!"));
  const excluded = patterns.filter((pattern) => pattern.startsWith("!"));

  const paths = globSync(
    ["package.json", ...included.map((pattern) => join(pattern, "package.json"))],
    {
      cwd: root,
      exclude: [
        "**/node_modules/**",
        ...excluded.map((pattern) => join(pattern.slice(1), "package.json")),
      ],
    },
  );

  return paths.map((path) => ({
    path,
    // pnpm has already parsed these manifests to load the workspace.
    manifest: /** @type {Manifest["manifest"]} */ (
      JSON.parse(readFileSync(join(root, path), "utf8"))
    ),
  }));
};

export const hooks = {
  /**
   * @template {{ workspaceDir: string, workspacePackagePatterns: readonly string[], catalogs: Catalogs }} Config
   * @param {Config} config
   * @returns {Config}
   */
  updateConfig(config) {
    const problems = findViolations(
      config.catalogs,
      readManifests(config.workspaceDir, config.workspacePackagePatterns),
    );

    if (problems.length > 0) {
      throw new Error(
        `@kutur-kit/strict: dependency versions must come from exact catalog entries or the workspace\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
      );
    }

    return config;
  },
};
