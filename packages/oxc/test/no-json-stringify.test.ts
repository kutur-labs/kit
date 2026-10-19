import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cases = [
  {
    name: "message",
    code: "export const message = (value: object) => `got ${JSON.stringify(value)}`;",
    warnings: 1,
  },
  { name: "computed", code: 'export const text = JSON["stringify"]({ a: 1 });', warnings: 1 },
  { name: "reference", code: "export const texts = [1, 2].map(JSON.stringify);", warnings: 1 },
  { name: "parse", code: 'export const value: number = JSON.parse("1");', warnings: 0 },
  {
    name: "shadowed",
    code: "const JSON = { stringify: (value: number) => `${value}` };\nexport const text = JSON.stringify(1);",
    warnings: 0,
  },
];

const lint = (preset: string, directory: string) => {
  const config = join(directory, "oxlint.config.ts");
  const modulePath = fileURLToPath(new URL(`../src/${preset}.ts`, import.meta.url));

  writeFileSync(
    config,
    // oxlint-disable-next-line kit/no-json-stringify -- a JavaScript string literal; this package does not depend on Effect.
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

  return result.stdout + result.stderr;
};

await test("effect warns on JSON.stringify of the global JSON, and base does not", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-json-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const effect = lint("effect", directory);

  for (const { name, warnings } of cases) {
    const diagnostics = effect
      .split("\n")
      .filter((line) => line.startsWith(join(directory, `${name}.ts`)))
      .filter((line) => line.includes("kit(no-json-stringify)"));

    assert.equal(diagnostics.length, warnings, `${name}: ${effect}`);

    for (const diagnostic of diagnostics) {
      assert.match(diagnostic, /\[Warning\/kit\(no-json-stringify\)\]$/);
    }
  }

  assert.doesNotMatch(lint("base", directory), /no-json-stringify/);
});
