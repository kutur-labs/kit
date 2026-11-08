import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cases = [
  {
    name: "css-keys.ts",
    code: `
export const styles = { panel: { shapeOutside: "circle()", cornerShape: "squircle", cornerTopLeftShape: "bevel" } };
export type BeatenBy = Readonly<{ cornerShape: "cornerTopLeftShape"; shapeMargin: never }>;
`,
    errors: [],
  },
  {
    name: "svg-attribute.tsx",
    code: `export const icon = <svg shapeRendering="crispEdges" />;`,
    errors: [],
  },
  {
    name: "own-names.ts",
    code: `
export const userShape = 1;
export type Props = Readonly<{ shapeOf: string }>;
export const counts = { cornerShapes: 1 };
export const shapeOutside = "circle()";
`,
    errors: ["userShape", "shapeOf", "cornerShapes", "shapeOutside"],
  },
];

await test("anti-slop rejects shape in names of ours but not in CSS property names", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-shape-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const config = join(directory, "oxlint.config.ts");
  const modulePath = fileURLToPath(new URL("../src/anti-slop.ts", import.meta.url));

  writeFileSync(
    config,
    `import preset from ${JSON.stringify(modulePath)};\nexport default preset;\n`,
  );

  const files = cases.map(({ name, code }) => {
    const file = join(directory, name);

    writeFileSync(file, code);

    return file;
  });

  const result = spawnSync(
    "pnpm",
    ["exec", "oxlint", "--config", config, "--format", "unix", ...files],
    { encoding: "utf8" },
  );

  const output = result.stdout + result.stderr;

  for (const { name, errors } of cases) {
    const names = output
      .split("\n")
      .filter(
        (line) =>
          line.startsWith(join(directory, name)) &&
          line.includes("anti-slop(no-shape-in-symbol-names)"),
      )
      .map((line) => /Rename symbol "(\w+)"/.exec(line)?.[1]);

    assert.deepEqual(names, errors, `${name}: ${output}`);
  }
});
