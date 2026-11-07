import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// tsgo reads `@effect-diagnostics` anywhere in a file, string literals included. Building the
// keyword at runtime keeps the cases below from switching off diagnostics in this file.
const effectKeyword = ["@effect", "diagnostics"].join("-");

const code = [
  "// It lands — today.",
  "/**",
  " * - a JSDoc list item",
  " * See https://example.com/landed and `gate`.",
  " *",
  " * ```ts",
  " * gate();",
  " * ```",
  " */",
  "// oxlint-disable-next-line no-debugger -- the debugger lands here",
  "debugger;",
  "/* oxlint-enable no-debugger -- the demo ends */",
  `/** ${effectKeyword} floatingEffect:off -- the fixture needs it */`,
  `// note: ${effectKeyword} floatingEffect:off -- the fixture needs it`,
  `// ${effectKeyword}-next-line floatingEffect:off -- a gated fixture`,
  "// @ts-expect-error -- the test passes a string where a number lands",
  'export const label = "Dziwne rzeczy – dla ludzi, którzy je rozumieją";',
  'const zażółć = "😀"; // It — lands.',
].join("\n");

// Oxlint's unix format: `<file>:<line>:<column>: <message> [Error/<code>]`. Columns count UTF-8
// bytes.
const finding =
  /^:(?<line>\d+):(?<column>\d+): "(?<text>[^"]+)" .+ \[Error\/kit\(comment-prose\)\]$/;

await test("anti-slop reports vague words and dashes in comments, but not in syntax or strings", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-comment-prose-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const preset = fileURLToPath(new URL("../src/anti-slop.ts", import.meta.url));
  const config = join(directory, "oxlint.config.ts");
  const file = join(directory, "sample.ts");

  writeFileSync(config, `import preset from ${JSON.stringify(preset)};\nexport default preset;\n`);
  writeFileSync(file, code);

  const result = spawnSync(
    "pnpm",
    ["exec", "oxlint", "--config", config, "--format", "unix", file],
    { encoding: "utf8" },
  );

  const lines = result.stdout.split("\n").filter((line) => line.includes("kit(comment-prose)"));

  assert.deepEqual(
    lines.map((line) => {
      const { line: row, column, text } = finding.exec(line.slice(file.length))?.groups ?? {};

      return `${row}:${column} ${text}`;
    }),
    ["1:7 lands", "1:13 —", "10:57 lands", "15:58 gated", "16:64 lands", "18:34 —", "18:38 lands"],
  );
  assert.equal(
    lines[0]?.slice(file.length),
    ':1:7: "lands" is vague. A plain word says what happens. Fix: say `merged`, `deployed` or `released`, or put a literal use in a code span. [Error/kit(comment-prose)]',
  );
});
