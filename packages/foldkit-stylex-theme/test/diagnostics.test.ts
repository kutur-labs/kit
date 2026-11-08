// Pins the compile errors users see, as the core's test/diagnostics.test.ts does. Runs tsrs once
// over test/errors; each fixture's first line, `// expect: <text>`, must be part of the last line
// of one of that fixture's errors, which editors and terminals show last. The README's errors
// table must quote exactly these texts.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..");

const output = spawnSync(
  path.join(root, "node_modules/.bin/tsrs"),
  ["-p", "tsconfig.errors.json", "--pretty", "false"],
  { cwd: root, encoding: "utf8" },
).stdout;

// Each fixture's errors, as the lines of each error: a head line and its indented continuation.
const errors = new Map<string, Array<Array<string>>>();

let current: Array<string> | undefined;

for (const line of output.split("\n")) {
  const head = /^test\/errors\/([^(]+)\(\d+,\d+\): error TS\d+: /.exec(line);

  if (head?.[1] !== undefined) {
    current = [line];
    errors.set(head[1], [...(errors.get(head[1]) ?? []), current]);
  } else if (current !== undefined && line.startsWith(" ")) {
    current.push(line);
  } else {
    current = undefined;
  }
}

const fixtures = readdirSync(path.join(root, "test/errors"))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => ({
    file,
    expected: /^\/\/ expect: (.+)/.exec(
      readFileSync(path.join(root, "test/errors", file), "utf8"),
    )?.[1],
  }));

describe("diagnostics", () => {
  for (const { file, expected } of fixtures) {
    it(`${file} fails with its message on the last line`, () => {
      const lastLines = (errors.get(file) ?? []).map((lines) => lines.at(-1) ?? "");

      expect(expected, `Start ${file} with a line "// expect: <message>".`).toBeDefined();
      expect(
        lastLines.some((last) => last.includes(expected ?? "")),
        lastLines.join("\n"),
      ).toBe(true);
    });
  }

  it("quotes every fixture's message, and only those, in the README's errors table", () => {
    const readme = readFileSync(path.join(root, "README.md"), "utf8");

    const section =
      readme.split(/^## /m).find((part) => part.startsWith("Errors you may see")) ?? "";

    // The last cell of each table row: the message in a code span.
    const quoted = [...section.matchAll(/^\|.*\|\s*`([^`]+)`\s*\|$/gm)].map((match) => match[1]);

    expect(new Set(quoted)).toEqual(new Set(fixtures.map(({ expected }) => expected)));
  });
});
