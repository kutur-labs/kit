// Pins what the foldkit-stylex canary and drift workflows test, in the pnpm-workspace.yaml of the
// working directory: the latest foldkit, @foldkit/ui and @foldkit/vite-plugin, the newest StyleX
// within @kutur-kit/foldkit-stylex's peer range and the newest Effect that those Foldkit releases
// and kit's peer range accept. pnpm adds an exact minimumReleaseAgeExclude entry for each release
// younger than its minimum age that it installs, so a pin from today installs too. Kit's own
// catalogs pin the lowest versions the peer ranges promise, so the workflows run this in their
// checkout only.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const file = "pnpm-workspace.yaml";

// Prints a field of the newest release that matches a tag or one range, or nothing when that
// release lacks the field.
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

const peerRange = (name: string) => {
  const range = peers.get(name);

  if (range === undefined) throw new Error(`The peers catalog has no ${name} range.`);

  return range;
};

const stylexRange = peerRange("@stylexjs/stylex");

const pins = new Map<string, string>();

for (const name of names) {
  if (isFoldkit(name)) pins.set(name, view(name, "latest", "version"));
  else if (name.startsWith("@stylexjs/")) pins.set(name, view(name, stylexRange, "version"));
}

// Where each range of effect comes from: kit's peers catalog and every pinned Foldkit release.
const effectRanges = [
  { source: "kit's peers catalog", range: peerRange("effect") },
  ...[...pins].flatMap(([name, version]) => {
    const range = isFoldkit(name) ? view(name, version, "peerDependencies.effect") : "";

    return range === "" ? [] : [{ source: `${name}@${version}`, range }];
  }),
];

// SAFETY: pnpm prints a package's `versions` as a JSON array of version strings.
const published = JSON.parse(view("effect", "latest", "versions")) as ReadonlyArray<string>;

// pnpm view returns the newest match of one range only, and for space-joined ranges that share no
// version it returns one outside them. semver's CLI prints the versions every -r range accepts,
// lowest first; it exits with 1 and prints nothing when there are none. --reporter=silent keeps
// the install progress that pnpm prints to stderr on a cold dlx cache out of the failure check.
const accepted = spawnSync(
  "pnpm",
  [
    "--reporter=silent",
    "dlx",
    "semver@7.8.5",
    ...effectRanges.flatMap(({ range }) => ["-r", range]),
    ...published,
  ],
  { encoding: "utf8" },
);

if (accepted.status !== 0 && accepted.stderr.trim() !== "") {
  throw new Error(`pnpm dlx semver@7.8.5 failed:\n${accepted.stderr}`);
}

const effect = accepted.stdout.trim().split("\n").at(-1);

if (accepted.status !== 0 || effect === undefined) {
  throw new Error(
    [
      "No effect release satisfies every range:",
      ...effectRanges.map(({ source, range }) => `  ${range} from ${source}`),
      "If only kit's range leaves out an Effect the Foldkit releases share, widen kit's effect peer once kit supports it. Otherwise these Foldkit releases accept no common Effect, which kit cannot fix.",
    ].join("\n"),
  );
}

for (const name of names) if (isEffect(name)) pins.set(name, effect);

const bumps = pinned.flatMap((entry) => {
  const pin = pins.get(entry.name);

  return pin === undefined || pin === entry.value ? [] : [{ ...entry, pin }];
});

for (const { index, key, pin } of bumps) lines[index] = `    ${key}: ${pin}`;

writeFileSync(file, lines.join("\n"));

console.log(
  bumps
    .map(({ catalog, name, value, pin }) => `${catalog}: ${name} ${value} -> ${pin}`)
    .join("\n") || "The catalogs already pin the newest versions.",
);
