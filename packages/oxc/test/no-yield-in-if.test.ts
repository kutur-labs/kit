import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cases = [
  {
    name: "consequent",
    code: "export function* run(enabled: boolean) { if (enabled) yield; }",
    errors: 1,
  },
  {
    name: "delegated-return",
    code: "export function* run(enabled: boolean) { if (enabled) return yield* [1]; }",
    errors: 1,
  },
  {
    name: "condition",
    code: "export function* run() { if (yield* [true]) return 1; }",
    errors: 1,
  },
  {
    name: "alternate",
    code: "export function* run(enabled: boolean) { if (enabled) return; else { yield 1; yield* [2]; } }",
    errors: 2,
  },
  {
    name: "else-if",
    code: "export function* run(enabled: boolean) { if (enabled) return; else if (yield true) return 1; }",
    errors: 1,
  },
  {
    name: "nested-branches",
    code: "export function* run(enabled: boolean, other: boolean) { if (enabled) { if (other) { for (const value of [1, 2]) yield value; } } }",
    errors: 1,
  },
  {
    name: "nested-function-branch",
    code: "export function run(enabled: boolean) { if (enabled) return function* (other: boolean) { yield 1; if (other) yield* [2]; }; }",
    errors: 1,
  },
  {
    name: "computed-method",
    code: 'export function* run(enabled: boolean) { if (enabled) return { *[yield "values"]() { yield 1; } }; }',
    errors: 1,
  },
  {
    name: "computed-class-method",
    code: 'export function* run(enabled: boolean) { if (enabled) return class { *[yield "values"]() { yield 1; } }; }',
    errors: 1,
  },
  {
    name: "independent-generators",
    code: `
export function* straightLine(enabled: boolean) {
  if (!enabled) return;
  yield 1;
  yield* [2];
}
export function declarations(enabled: boolean) {
  if (enabled) {
    function* values() { yield 1; }
    return values;
  }
}
export function expressions(enabled: boolean) {
  if (enabled) return function* () { yield* [1]; };
}
export function methods(enabled: boolean) {
  if (enabled) return { *values() { yield 1; } };
}
export function classes(enabled: boolean) {
  if (enabled) return class { *values() { yield* [1]; } };
}
`,
    errors: 0,
  },
];

for (const preset of ["base", "effect"]) {
  await test(`${preset} rejects yields in if statements within the same function`, (context) => {
    const directory = mkdtempSync(join(tmpdir(), "kit-yield-"));
    context.after(() => rmSync(directory, { recursive: true, force: true }));

    const config = join(directory, "oxlint.config.ts");
    const modulePath = fileURLToPath(new URL(`../src/${preset}.ts`, import.meta.url));

    writeFileSync(
      config,
      `import preset from ${JSON.stringify(modulePath)};\nexport default preset;\n`,
    );

    const files = cases.map(({ name, code }) => {
      const file = join(directory, `${name}.ts`);

      writeFileSync(file, code);

      return file;
    });

    const result = spawnSync(
      "pnpm",
      ["exec", "oxlint", "--config", config, "--format", "unix", ...files],
      {
        encoding: "utf8",
      },
    );

    const output = result.stdout + result.stderr;
    assert.equal(result.status, 1, output);

    for (const { name, errors } of cases) {
      const diagnostics = output
        .split("\n")
        .filter((line) => line.startsWith(join(directory, `${name}.ts`)));

      assert.equal(diagnostics.length, errors, `${name}: ${output}`);

      for (const diagnostic of diagnostics) {
        assert.match(diagnostic, /kit\(no-yield-in-if\)/);
      }
    }
  });
}
