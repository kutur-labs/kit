import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { noSuppressionDirectives } from "../src/rules/no-suppression-directives.ts";

// tsgo reads `@effect-diagnostics` anywhere in a file, string literals included. Building the
// keyword at runtime keeps the cases below from switching off diagnostics in this file.
const effectKeyword = ["@effect", "diagnostics"].join("-");

// Each finding is `<line> <label>`. The label is a message id of this rule, `unused-directive` for
// Oxlint's report of a directive that suppressed nothing, or the code of another rule.
const cases = [
  {
    name: "blanket-disable",
    code: "/* oxlint-disable */\ndebugger;\n",
    preset: ["1 unicorn(no-abusive-eslint-disable)"],
    strict: ["1 unicorn(no-abusive-eslint-disable)"],
  },
  {
    name: "blanket-eslint-disable",
    code: "/* eslint-disable */\ndebugger;\n",
    preset: ["1 unicorn(no-abusive-eslint-disable)"],
    strict: ["1 unicorn(no-abusive-eslint-disable)"],
  },
  {
    name: "blanket-disable-mid-file",
    code: "const z = 1;\n/* eslint-disable */\nexport { z };\n",
    preset: ["2 unicorn(no-abusive-eslint-disable)"],
    strict: ["2 unicorn(no-abusive-eslint-disable)"],
  },
  {
    name: "blanket-disable-with-reason",
    code: "/* oxlint-disable -- reason */\ndebugger;\n",
    preset: ["1 unicorn(no-abusive-eslint-disable)"],
    strict: ["1 unicorn(no-abusive-eslint-disable)"],
  },
  {
    name: "disable",
    code: "// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "disable-with-reason",
    code: "// oxlint-disable-next-line no-debugger -- the debugger is the demo\ndebugger;\n",
    preset: [],
    strict: ["1 suppression"],
  },
  {
    name: "disable-in-jsdoc",
    code: "/** oxlint-disable-next-line no-debugger */\ndebugger;\n",
    preset: ["2 eslint(no-debugger)"],
    strict: ["2 eslint(no-debugger)"],
  },
  {
    name: "rule-name-in-prose",
    code: "// Policy: see kit/no-suppression-directives.\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["2 unexplained"],
    strict: ["2 suppression"],
  },
  {
    name: "rule-name-in-reason",
    code: "// oxlint-disable-next-line no-debugger -- no-suppression-directives does not apply here\ndebugger;\n",
    preset: [],
    strict: ["1 suppression"],
  },
  {
    name: "directive-name-in-prose",
    code: "// We never write oxlint-disable comments here.\nexport const y = 2;\n",
    preset: [],
    strict: [],
  },
  {
    name: "self-disable",
    code: "/* oxlint-disable kit/no-suppression-directives */\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-next-line-with-another-rule",
    code: "// oxlint-disable-next-line no-debugger, kit/no-suppression-directives\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-file-with-another-rule",
    code: "/* oxlint-disable no-debugger, kit/no-suppression-directives */\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-with-reason",
    code: "/* oxlint-disable no-debugger, kit/no-suppression-directives -- because */\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-space-separated",
    code: "/* oxlint-disable kit/no-suppression-directives no-debugger */\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-across-lines",
    code: "/* oxlint-disable no-debugger,\n   kit/no-suppression-directives */\ndebugger;\n",
    preset: ["2 unused-directive"],
    strict: ["2 unused-directive"],
  },
  {
    name: "self-disable-after-newline",
    code: "/*\n oxlint-disable kit/no-suppression-directives\n*/\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-foreign-prefix",
    code: "/* oxlint-disable evil/no-suppression-directives */\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    name: "self-disable-region",
    code: "/* oxlint-disable kit/no-suppression-directives */\n// oxlint-disable-next-line no-debugger\ndebugger;\n/* oxlint-enable kit/no-suppression-directives */\n",
    preset: ["4 unused-directive"],
    strict: ["4 unused-directive"],
  },
  {
    // Oxlint ignores JSDoc directives, so the rule must still check the file.
    name: "self-disable-in-jsdoc",
    code: `/** oxlint-disable kit/no-suppression-directives */\n// ${effectKeyword} *:off\n// oxlint-disable-next-line no-debugger\ndebugger;\n`,
    preset: ["2 unexplained", "3 unexplained"],
    strict: ["2 suppression", "3 suppression"],
  },
  {
    name: "self-disable-in-multiline-jsdoc",
    code: `/**\n * oxlint-disable kit/no-suppression-directives\n */\n// ${effectKeyword} skip-file\nexport const l = 1;\n`,
    preset: ["4 unexplained"],
    strict: ["4 suppression"],
  },
  {
    name: "self-enable",
    code: "// oxlint-enable kit/no-suppression-directives\nexport const u = 1;\n",
    preset: ["1 unused-directive"],
    strict: ["1 unused-directive"],
  },
  {
    // `oxlint-enable-next-line` is not a directive, so it neither counts as one nor switches the rule off.
    name: "self-enable-next-line",
    code: "// oxlint-enable-next-line kit/no-suppression-directives\n// oxlint-disable-next-line no-debugger\ndebugger;\n",
    preset: ["2 unexplained"],
    strict: ["2 suppression"],
  },
  {
    name: "disable-abusive-then-blanket",
    code: "/* oxlint-disable unicorn/no-abusive-eslint-disable */\n/* oxlint-disable */\ndebugger;\n",
    preset: ["1 fence"],
    strict: ["1 suppression"],
  },
  {
    name: "disable-abusive-with-reason-then-blanket",
    code: "/* oxlint-disable unicorn/no-abusive-eslint-disable -- reason */\n/* oxlint-disable */\ndebugger;\n",
    preset: ["1 fence"],
    strict: ["1 suppression"],
  },
  {
    name: "disable-abusive-space-separated-then-blanket",
    code: "/* oxlint-disable unicorn/no-abusive-eslint-disable no-debugger -- reason */\n/* oxlint-disable */\ndebugger;\n",
    preset: ["1 fence"],
    strict: ["1 suppression"],
  },
  {
    name: "disable-ban-ts-comment-with-reason",
    code: "/* oxlint-disable typescript/ban-ts-comment -- reason */\n// @ts-nocheck\nexport const r = 1;\n",
    preset: ["1 fence"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-next-line",
    code: `// ${effectKeyword}-next-line floatingEffect:off\nexport const x = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-next-line-with-reason",
    code: `// ${effectKeyword}-next-line floatingEffect:off -- the fixture needs it\nexport const v = 1;\n`,
    preset: [],
    strict: ["1 suppression"],
  },
  {
    name: "effect-file-with-reason",
    code: `// ${effectKeyword} floatingEffect:off -- file-level with reason\nexport const s = 1;\n`,
    preset: [],
    strict: ["1 suppression"],
  },
  {
    name: "effect-after-rule-name-in-prose",
    code: `// no-suppression-directives documents our policy\n// ${effectKeyword}-next-line floatingEffect:off\nexport const w = 1;\n`,
    preset: ["2 unexplained"],
    strict: ["2 suppression"],
  },
  {
    name: "effect-wildcard-with-reason",
    code: `// ${effectKeyword} *:off -- everything\nexport const q = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-skip-file-with-reason",
    code: `// ${effectKeyword} skip-file -- reason\nexport const m = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-in-jsdoc",
    code: `/** ${effectKeyword} floatingEffect:off */\nexport const p = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-in-jsdoc-with-reason",
    code: `/** ${effectKeyword} floatingEffect:off -- the fixture needs it */\nexport const j = 1;\n`,
    preset: [],
    strict: ["1 suppression"],
  },
  {
    name: "effect-in-multiline-jsdoc",
    code: `/**\n * Fixture.\n * ${effectKeyword} floatingEffect:off\n */\nexport const o = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "effect-mid-comment-with-reason",
    code: `// note: ${effectKeyword} floatingEffect:off -- the fixture needs it\nexport const n = 1;\n`,
    preset: [],
    strict: ["1 suppression"],
  },
  {
    // The second directive must not pass as part of the first one's reason.
    name: "effect-twice-on-one-line",
    code: `// ${effectKeyword} floatingEffect:off -- r ${effectKeyword} *:off\nexport const k = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    // tsgo reads a directive up to the end of its line, so the reason on the next line is not its reason.
    name: "effect-reason-on-next-line",
    code: `/* ${effectKeyword} floatingEffect:off\n   -- the fixture needs it */\nexport const i = 1;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    // tsgo honours the Effect directive inside the reason of an Oxlint directive.
    name: "effect-in-disable-reason",
    code: `// oxlint-disable-next-line no-debugger -- the debugger is the demo ${effectKeyword} *:off\ndebugger;\n`,
    preset: ["1 unexplained"],
    strict: ["1 suppression"],
  },
  {
    name: "ts-expect-error",
    code: "export const a: number = 1;\n// @ts-expect-error\nexport const b: string = a;\n",
    preset: ["2 typescript(ban-ts-comment)"],
    strict: ["2 typescript(ban-ts-comment)"],
  },
  {
    name: "ts-expect-error-with-description",
    code: "export const a: number = 1;\n// @ts-expect-error: the type test asserts this mismatch\nexport const b: string = a;\n",
    preset: [],
    strict: ["2 typescript(ban-ts-comment)"],
  },
  {
    name: "ts-nocheck",
    code: "// @ts-nocheck\nexport const c = 1;\n",
    preset: ["1 typescript(ban-ts-comment)"],
    strict: ["1 typescript(ban-ts-comment)"],
  },
];

// `preset` uses the preset as published. `strict` configures the rule without options and
// `ban-ts-comment` without exceptions, so no suppression passes.
const modes = [
  { name: "preset", rules: {} },
  {
    name: "strict",
    rules: {
      "kit/no-suppression-directives": "error",
      "typescript/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true },
      ],
    },
  },
] as const;

const ruleCode = "kit(no-suppression-directives)";

const messageIds = new Map(
  Object.entries(noSuppressionDirectives.meta?.messages ?? {}).map(([id, message]) => [
    message,
    id,
  ]),
);

// Oxlint's unix format: `<file>:<line>:<column>: <message> [Error/<code>]`, or `[Error]` for an
// unused directive.
const unixDiagnostic = /^(?<line>\d+):\d+: (?<message>.+) \[Error(?:\/(?<code>.+))?\]$/;

const label = (message: string, code: string | undefined) => {
  if (code === ruleCode) return messageIds.get(message) ?? message;

  if (code !== undefined) return code;

  return message.startsWith("Unused ") ? "unused-directive" : message;
};

const findingsIn = (output: string, file: string) =>
  output
    .split("\n")
    .flatMap((line) => {
      if (!line.startsWith(`${file}:`)) return [];

      const {
        line: row = "",
        message = "",
        code,
      } = unixDiagnostic.exec(line.slice(file.length + 1))?.groups ?? {};

      return [`${row} ${label(message, code)}`];
    })
    .sort();

for (const preset of ["base", "effect"]) {
  for (const mode of modes) {
    await test(`${preset} in ${mode.name} mode reports suppressions`, async (context) => {
      const directory = mkdtempSync(join(tmpdir(), "kit-suppression-"));
      context.after(() => rmSync(directory, { recursive: true, force: true }));

      const config = join(directory, "oxlint.config.ts");
      const modulePath = fileURLToPath(new URL(`../src/${preset}.ts`, import.meta.url));

      // The consumer sets its own `options`; `reportUnusedDisableDirectives` must survive the merge.
      writeFileSync(
        config,
        `import preset from ${JSON.stringify(modulePath)};\nexport default { extends: [preset], options: { typeAware: true, maxWarnings: 0 }, rules: ${JSON.stringify(mode.rules)} };\n`,
      );

      for (const { name, code } of cases) writeFileSync(join(directory, `${name}.ts`), code);

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
          ...cases.map(({ name }) => join(directory, `${name}.ts`)),
        ],
        { encoding: "utf8" },
      );

      const output = result.stdout + result.stderr;
      assert.equal(result.status, 1, output);

      for (const testCase of cases) {
        await context.test(testCase.name, () => {
          assert.deepEqual(
            findingsIn(output, join(directory, `${testCase.name}.ts`)),
            testCase[mode.name],
          );
        });
      }
    });
  }
}
