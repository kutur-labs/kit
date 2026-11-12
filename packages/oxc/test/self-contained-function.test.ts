import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cases = [
  {
    name: "module-bindings",
    code: `import { readFileSync } from "node:fs";

const minimum = 4.5;
let calls = 0;
const ratio = (a: number, b: number) => (a + 0.05) / (b + 0.05);

export const check = (a: number, b: number) => {
  calls += 1;
  return ratio(a, b) >= minimum ? [] : [readFileSync];
};
`,
    errors: 4,
  },
  {
    name: "declarations",
    code: `const pattern = /^var\\(/;

export function scan(value: string) {
  return pattern.test(value);
}

export default function (value: string) {
  return pattern.exec(value);
}

export const named = function inner(value: string): boolean {
  return value === "" || pattern.test(value) || inner(value.slice(1));
};
`,
    errors: 3,
  },
  {
    name: "arrow-recursion",
    code: `export const depth = (value: string): number => (value === "" ? 0 : 1 + depth(value.slice(1)));
`,
    errors: 1,
  },
  {
    name: "self-contained",
    code: `import type { Stats } from "node:fs";

type Options = Readonly<{ part?: string }>;

interface Finding {
  readonly at: string;
}

const defaults = { part: "html" };

// Module bindings outside exported functions, and exported values that are not functions, are not
// sent to a page.
const helper = (options: Options) => options.part ?? defaults.part;

export const settings: Options = { part: helper(defaults) };

export function walk(node: Element | null): number {
  return node === null ? 0 : 1 + walk(node.parentElement);
}

export const measure = (options: Options = {}): ReadonlyArray<Finding> & { stats?: Stats } => {
  const keys = ["surface", "text"] as const;
  type Key = (typeof keys)[number];
  const inner = (key: Key) => document.querySelector(options.part ?? key);
  const fallback: typeof defaults = { part: "body" };

  return keys.flatMap((key) => (inner(key) === null ? [{ at: fallback.part }] : [])).map((finding) => ({
    ...finding,
    at: Math.max(1, finding.at.length).toString(),
  }));
};
`,
    errors: 0,
  },
];

await test("self-contained-function reports exported functions that read module bindings", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-self-contained-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const config = join(directory, "oxlint.config.ts");
  const modulePath = fileURLToPath(new URL("../src/base.ts", import.meta.url));

  writeFileSync(
    config,
    `import base from ${JSON.stringify(modulePath)};
export default { ...base, rules: { ...base.rules, "kit/self-contained-function": "error" } };
`,
  );

  const files = cases.map(({ name, code }) => {
    const file = join(directory, `${name}.ts`);

    writeFileSync(file, code);

    return file;
  });

  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "effect-tsgo",
      "--tsrs-lint",
      "oxlint",
      "--config",
      config,
      "--format",
      "unix",
      ...files,
    ],
    { encoding: "utf8" },
  );

  const output = result.stdout + result.stderr;

  for (const { name, errors } of cases) {
    const diagnostics = output
      .split("\n")
      .filter(
        (line) =>
          line.startsWith(join(directory, `${name}.ts`)) &&
          line.includes("kit(self-contained-function)"),
      );

    assert.equal(diagnostics.length, errors, `${name}: ${output}`);
  }

  assert.match(
    output,
    /Playwright sends this function to the page as source, so it cannot reach `ratio` outside its body\. Move the helper inside the function\./,
  );
});
