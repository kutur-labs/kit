// Pins what the foldkit-stylex canary and drift workflows test, in the pnpm-workspace.yaml of the
// working directory: the latest foldkit, @foldkit/ui and @foldkit/vite-plugin, the newest StyleX
// within @kutur-kit/foldkit-stylex's peer range and the newest Effect that those Foldkit releases
// and kit's peer range accept. Each new pin gets an exact minimumReleaseAgeExclude entry, so a
// release from today installs. Kit's own catalogs pin the lowest versions the peer ranges promise,
// so the workflows run this in their checkout only.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const file = "pnpm-workspace.yaml";

// Prints a field of the newest release that matches a tag or range, or nothing when that release
// lacks the field. Space-separated ranges must all match.
const view = (name: string, range: string, field: string) => {
  const { status, stdout, stderr } = spawnSync("pnpm", ["view", `${name}@${range}`, field], {
    encoding: "utf8",
  });

  if (status !== 0) throw new Error(`pnpm view ${name}@${range} ${field} failed:\n${stderr}`);

  return stdout.trim();
};

const unquote = (text: string) => (text.startsWith('"') ? text.slice(1, -1) : text);

const isFoldkit = (name: string) => name === "foldkit" || name.startsWith("@foldkit/");

// Effect releases effect and its @effect/platform-* packages together at one version.
const isEffect = (name: string) => name === "effect" || name.startsWith("@effect/platform-");

const lines = readFileSync(file, "utf8").split("\n");

// Each catalog is a `  <catalog>:` heading over `    name: version` lines, with names that start
// with @ and ranges with spaces quoted. Any other line fails, so no entry goes unpinned unseen.
const entries: Array<{ index: number; catalog: string; key: string; name: string; value: string }> =
  [];

let section = "";

let catalog = "";

for (const [index, line] of lines.entries()) {
  const [, heading] = /^ {2}(\S+):$/.exec(line) ?? [];
  const [, key, value] = /^ {4}("[^"]+"|[^\s"]+): ("[^"]*"|\S+)$/.exec(line) ?? [];

  if (/^[^\s#]/.test(line)) section = line;
  else if (section !== "catalogs:" || /^\s*(#|$)/.test(line)) continue;
  else if (heading !== undefined) catalog = heading;
  else if (key !== undefined && value !== undefined) {
    entries.push({ index, catalog, key, name: unquote(key), value: unquote(value) });
  } else throw new Error(`${file}:${index + 1} is not a catalog entry: ${line}`);
}

const peers = new Map(
  entries.flatMap(({ catalog, name, value }) => (catalog === "peers" ? [[name, value]] : [])),
);

const pinned = entries.filter(({ catalog }) => catalog !== "peers");

const names = new Set(pinned.map(({ name }) => name));

const stylexRange = peers.get("@stylexjs/stylex");

if (stylexRange === undefined) throw new Error("The peers catalog has no @stylexjs/stylex range.");

const pins = new Map<string, string>();

for (const name of names) {
  if (isFoldkit(name)) pins.set(name, view(name, "latest", "version"));
  else if (name.startsWith("@stylexjs/")) pins.set(name, view(name, stylexRange, "version"));
}

const effectRange = [
  peers.get("effect") ?? "",
  ...[...pins].map(([name, version]) =>
    isFoldkit(name) ? view(name, version, "peerDependencies.effect") : "",
  ),
]
  .filter((range) => range !== "")
  .join(" ");

const effect = view("effect", effectRange, "version");

for (const name of names) if (isEffect(name)) pins.set(name, effect);

const bumps = pinned.flatMap((entry) => {
  const pin = pins.get(entry.name);

  return pin === undefined || pin === entry.value ? [] : [{ ...entry, pin }];
});

for (const { index, key, pin } of bumps) lines[index] = `    ${key}: ${pin}`;

const list = lines.indexOf("minimumReleaseAgeExclude:");

if (list === -1) throw new Error(`${file} has no minimumReleaseAgeExclude list.`);

const items = lines.slice(list + 1).findIndex((line) => !line.startsWith("  - "));

const end = items === -1 ? lines.length : list + 1 + items;

const excluded = new Set(lines.slice(list + 1, end).map((line) => unquote(line.slice(4))));

const exclusions = [...new Set(bumps.map(({ name, pin }) => `${name}@${pin}`))].filter(
  (exclusion) => !excluded.has(exclusion),
);

lines.splice(end, 0, ...exclusions.map((exclusion) => `  - ${JSON.stringify(exclusion)}`));

writeFileSync(file, lines.join("\n"));

console.log(
  [
    ...bumps.map(({ catalog, name, value, pin }) => `${catalog}: ${name} ${value} -> ${pin}`),
    ...exclusions.map((exclusion) => `minimumReleaseAgeExclude: ${exclusion}`),
  ].join("\n") || "The catalogs already pin the newest versions.",
);
