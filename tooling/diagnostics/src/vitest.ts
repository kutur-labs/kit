// Pins the compile errors a package's users see. Runs the package's tsrs once with its
// tsconfig.errors.json over test/errors; each fixture's first line, `// expect: <text>`, must be part
// of the last line of every error that fixture has, which is the line editors and terminals show
// last. So a mistake never also prints an error that names another fix. `@ts-expect-error` would
// pass on any error. The README's "Errors you may see" table must quote exactly these texts.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Each fixture's errors, as the lines of each error: a head line and its indented continuation.
const errorsOf = (output: string) => {
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

  return errors;
};

/** Registers the diagnostics tests for the package at `root`. */
export const describeDiagnostics = (root: string) => {
  const errors = errorsOf(
    spawnSync(
      path.join(root, "node_modules/.bin/tsrs"),
      ["-p", "tsconfig.errors.json", "--pretty", "false"],
      { cwd: root, encoding: "utf8" },
    ).stdout,
  );

  // Files whose name starts with `_` hold code the fixtures share, not a mistake.
  const fixtures = readdirSync(path.join(root, "test/errors"))
    .filter((file) => file.endsWith(".ts") && !file.startsWith("_"))
    .map((file) => ({
      file,
      expected: /^\/\/ expect: (.+)/.exec(
        readFileSync(path.join(root, "test/errors", file), "utf8"),
      )?.[1],
    }));

  describe("diagnostics", () => {
    for (const { file, expected } of fixtures) {
      it(`${file} fails with its message on the last line of each error`, () => {
        const lastLines = (errors.get(file) ?? []).map((lines) => lines.at(-1) ?? "");

        expect(expected, `Start ${file} with a line "// expect: <message>".`).toBeDefined();
        expect(lastLines, `${file} compiles; make it fail with its message.`).not.toEqual([]);
        expect(
          lastLines.filter((last) => !last.includes(expected ?? "")),
          "These errors do not end in the fixture's message: make the mistake print that message only.",
        ).toEqual([]);
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
};
