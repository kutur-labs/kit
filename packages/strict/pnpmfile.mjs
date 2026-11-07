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
 * @typedef {{ readonly minimumReleaseAgeExclude?: readonly string[], readonly minimumReleaseAgeExcludePrune?: boolean }} ReleaseAgeSettings
 */

// Peer ranges tell consumers what they may install, so only these fields must
// resolve to one exact version.
/** @type {readonly PinnedField[]} */
const pinnedFields = ["dependencies", "devDependencies", "optionalDependencies"];

const exactVersion = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

// pnpm reads `!`, `*` and `?` in an excluded name as a pattern, so a name may
// use only the characters npm allows in new package names. Older packages may
// also have capitals, such as `JSONStream`.
const packageName = /^(?:@[a-z\d-][\w.-]*\/)?[a-z\d-][\w.-]*$/i;

/**
 * Splits a spec at the `@` that ends the package name. A scoped name starts
 * with `@`, so that one never counts. A bare name has an empty version.
 *
 * @param {string} spec
 * @returns {[name: string, version: string]}
 */
const splitSpec = (spec) => {
  const at = spec.lastIndexOf("@");

  return at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, ""];
};

/** @param {string} spec */
const isExact = (spec) =>
  exactVersion.test(spec.startsWith("npm:") ? splitSpec(spec.slice("npm:".length))[1] : spec);

// pnpm writes several excluded versions of one package as `name@1.0.0 || 1.0.1`.
/** @param {string} entry */
const isExactExclusion = (entry) => {
  const [name, versions] = splitSpec(entry);

  return (
    packageName.test(name) &&
    versions.split("||").every((version) => exactVersion.test(version.trim()))
  );
};

/**
 * @param {Catalogs} catalogs
 * @param {string} path
 * @param {PinnedField} field
 * @param {[name: string, spec: string]} dependency
 */
const problemWith = (catalogs, path, field, [name, spec]) => {
  if (spec.startsWith("workspace:")) return undefined;

  if (!spec.startsWith("catalog:")) {
    return `${path}: ${field}.${name} is "${spec}". Versions outside the catalogs can differ between packages. Fix: use \`catalog:\` or \`workspace:\`.`;
  }

  const catalog = spec.slice("catalog:".length) || "default";
  const version = catalogs[catalog]?.[name];

  return version === undefined || isExact(version)
    ? undefined
    : `pnpm-workspace.yaml: catalogs.${catalog}.${name} is "${version}". A range or tag lets the installed version move without an edit to this entry. Fix: replace it with an exact version, such as the one in \`pnpm-lock.yaml\`.`;
};

/**
 * Lists versions that bypass the catalogs, and catalog entries that are not
 * exact although a non-peer dependency uses them.
 *
 * @param {Catalogs} catalogs
 * @param {readonly Manifest[]} manifests
 * @returns {string[]}
 */
export const findCatalogViolations = (catalogs, manifests) => {
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

/**
 * Lists release-age exclusions that also exempt versions published later, and
 * a prune setting that is not on.
 *
 * @param {ReleaseAgeSettings} settings
 * @returns {string[]}
 */
const findReleaseAgeViolations = ({
  minimumReleaseAgeExclude = [],
  minimumReleaseAgeExcludePrune,
}) => {
  const problems = minimumReleaseAgeExclude
    .filter((entry) => !isExactExclusion(entry))
    .map(
      (entry) =>
        `pnpm-workspace.yaml: minimumReleaseAgeExclude has "${entry}". A name pattern also exempts other packages, and a bare name, range or tag also exempts versions published later. Fix: list one package name with exact versions, as \`name@1.2.3\` or \`name@1.2.3 || 1.2.4\`.`,
    );

  if (minimumReleaseAgeExcludePrune !== true) {
    problems.push(
      "pnpm-workspace.yaml: minimumReleaseAgeExcludePrune is not true. pnpm adds exclusions on its own and keeps them after the lockfile drops those versions. Fix: set `minimumReleaseAgeExcludePrune: true`.",
    );
  }

  return problems;
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
   * @template {ReleaseAgeSettings & { workspaceDir: string, workspacePackagePatterns: readonly string[], catalogs: Catalogs }} Config
   * @param {Config} config
   * @returns {Config}
   */
  updateConfig(config) {
    const problems = [
      ...findCatalogViolations(
        config.catalogs,
        readManifests(config.workspaceDir, config.workspacePackagePatterns),
      ),
      ...findReleaseAgeViolations(config),
    ];

    if (problems.length > 0) {
      throw new Error(
        `@kutur-kit/strict stopped the install\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
      );
    }

    return config;
  },
};
