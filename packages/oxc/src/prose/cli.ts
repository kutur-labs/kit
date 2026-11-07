#!/usr/bin/env node
import { globSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { proseProblems } from "./problems.ts";

const usage = "Usage: kit-prose [--budget <file>=<characters>]... <glob>...";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { budget: { type: "string", multiple: true, default: [] } },
});

if (positionals.length === 0) throw new Error(`No glob given. ${usage}`);

// Keyed by absolute path, so `AGENTS.md` and `./AGENTS.md` name the same file.
const budgets = new Map(
  values.budget.map((entry) => {
    const { file, limit } = /^(?<file>.+)=(?<limit>\d+)$/.exec(entry)?.groups ?? {};

    if (file === undefined || limit === undefined) {
      throw new Error(`--budget ${entry} is not <file>=<characters>. ${usage}`);
    }

    return [resolve(file), { file, limit: Number(limit) }] as const;
  }),
);

const failures: string[] = [];

const files = new Set<string>();

for (const pattern of positionals) {
  const entries = globSync(pattern, { exclude: ["**/node_modules"], withFileTypes: true });

  if (entries.length === 0) {
    failures.push(
      `${pattern}: matches no file. The pattern checks nothing. Fix: correct the pattern or remove it.`,
    );
  }

  // A symlink such as `CLAUDE.md` is not a file entry, so its target is not reported twice.
  for (const entry of entries) {
    if (entry.isFile()) files.add(join(entry.parentPath, entry.name));
  }
}

const checked = new Set(Array.from(files, (file) => resolve(file)));

for (const [path, { file }] of budgets) {
  if (!checked.has(path)) {
    failures.push(
      `${file}: has a budget, but no pattern matches it. The budget checks nothing. Fix: correct the path or add a pattern that matches it.`,
    );
  }
}

for (const file of Array.from(files).sort()) {
  const markdown = readFileSync(file, "utf8");

  for (const { index, text, message } of proseProblems(markdown)) {
    failures.push(`${file}:${markdown.slice(0, index).split("\n").length}: "${text}" ${message}`);
  }

  const budget = budgets.get(resolve(file));
  // Code points, so a character outside the BMP counts once.
  const characters = Array.from(markdown).length;

  if (budget !== undefined && characters > budget.limit) {
    failures.push(
      `${file}: ${characters} characters, over its budget of ${budget.limit}. Raising the budget needs the user. Fix: shorten it or move a rule into a check.`,
    );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  // Unlike `process.exit`, `exitCode` lets stderr finish writing to a pipe.
  process.exitCode = 1;
} else {
  console.log(`Checked prose in ${files.size} Markdown ${files.size === 1 ? "file" : "files"}.`);
}
