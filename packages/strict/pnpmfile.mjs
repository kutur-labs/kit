// @ts-check
// pnpm loads this file before installing anything, so it can import only Node
// built-ins and pnpm rejects TypeScript pnpmfiles.
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {Readonly<Record<string, string>>} Versions
 * @typedef {Readonly<Record<string, Versions>>} Catalogs
 * @typedef {"dependencies" | "devDependencies" | "optionalDependencies"} PinnedField
 * @typedef {Readonly<Record<string, string>>} Scripts
 * @typedef {{ readonly path: string, readonly manifest: Readonly<Partial<Record<PinnedField, Versions>> & { scripts?: Scripts }> }} Manifest
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

// Every command and alias that `pnpm --help` lists in pnpm 12, and `pm`, which
// it leaves out: `pnpm pm <command>` runs a built-in over a same-named script.
// The tests compare this list with the installed pnpm.
/** @type {readonly string[]} */
export const pnpmCommands = [
  "access",
  "add",
  "adduser",
  "approve",
  "approve-builds",
  "audit",
  "bin",
  "bugs",
  "c",
  "cache",
  "cat-file",
  "cat-index",
  "change",
  "ci",
  "clean",
  "clean-install",
  "completion",
  "config",
  "create",
  "dedupe",
  "deploy",
  "deprecate",
  "dislink",
  "dist-tag",
  "dist-tags",
  "dlx",
  "docs",
  "doctor",
  "edit",
  "env",
  "exec",
  "fetch",
  "find",
  "find-hash",
  "get",
  "help",
  "home",
  "i",
  "ic",
  "ignored-builds",
  "import",
  "info",
  "init",
  "install",
  "install-clean",
  "install-test",
  "issues",
  "it",
  "la",
  "lane",
  "licences",
  "licenses",
  "link",
  "list",
  "ll",
  "ln",
  "login",
  "logout",
  "ls",
  "m",
  "multi",
  "outdated",
  "owner",
  "owners",
  "pack",
  "pack-app",
  "patch",
  "patch-commit",
  "patch-remove",
  "peers",
  "permissions",
  "ping",
  "pipeline",
  "pkg",
  "pm",
  "prefix",
  "profile",
  "prune",
  "publish",
  "purge",
  "rb",
  "rebuild",
  "recursive",
  "remove",
  "repo",
  "restart",
  "rm",
  "root",
  "rt",
  "run",
  "run-script",
  "runtime",
  "s",
  "sbom",
  "se",
  "search",
  "self-update",
  "set",
  "set-script",
  "setup",
  "shim",
  "show",
  "ss",
  "stage",
  "star",
  "stars",
  "start",
  "stop",
  "store",
  "t",
  "tasks",
  "team",
  "test",
  "token",
  "tst",
  "un",
  "undeprecate",
  "uni",
  "uninstall",
  "unlink",
  "unpublish",
  "unstar",
  "up",
  "update",
  "upgrade",
  "v",
  "version",
  "view",
  "whoami",
  "why",
  "with",
  "xmas",
];

// These commands run the script of their name in each selected package: the
// command itself does for `test`, `start`, `stop` and `restart`, and `install`,
// `publish` and `version` run it as a lifecycle step.
const commandsThatRunTheScript = new Set([
  "install",
  "publish",
  "restart",
  "start",
  "stop",
  "test",
  "version",
]);

// These commands give way to a same-named script in the package.json of the
// directory pnpm runs in. From the root, `pnpm -r clean` and
// `pnpm --filter <package> clean` therefore run the built-in, which removes
// every `node_modules`, unless the root package.json has a `clean` script too.
const commandsThatYieldToTheScript = new Set(["clean", "purge", "rb", "rebuild", "tasks"]);

const commandsThatHideTheScript = new Set(
  pnpmCommands.filter(
    (name) => !commandsThatRunTheScript.has(name) && !commandsThatYieldToTheScript.has(name),
  ),
);

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

/**
 * Lists scripts that a pnpm command of the same name runs in their place, such
 * as a `deploy` script under pnpm's `deploy`.
 *
 * @param {readonly Manifest[]} manifests
 * @returns {string[]}
 */
const findHiddenScripts = (manifests) => {
  const rootScripts = manifests.find(({ path }) => path === "package.json")?.manifest.scripts ?? {};

  return manifests.flatMap(({ path, manifest }) =>
    Object.keys(manifest.scripts ?? {}).flatMap((name) => {
      if (commandsThatHideTheScript.has(name)) {
        return [
          `${path}: scripts.${name} has the name of a pnpm command, so \`pnpm ${name}\` runs that command, not this script. Fix: rename the script.`,
        ];
      }

      if (commandsThatYieldToTheScript.has(name) && !Object.hasOwn(rootScripts, name)) {
        return [
          `${path}: scripts.${name} runs only from its own directory. From the root, \`pnpm -r ${name}\` and \`pnpm --filter <package> ${name}\` run pnpm's \`${name}\` command instead. Fix: rename the script, or add a \`${name}\` script to the root package.json.`,
        ];
      }

      return [];
    }),
  );
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
    const manifests = readManifests(config.workspaceDir, config.workspacePackagePatterns);

    const problems = [
      ...findCatalogViolations(config.catalogs, manifests),
      ...findHiddenScripts(manifests),
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
