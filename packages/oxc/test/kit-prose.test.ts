import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/prose/cli.ts", import.meta.url));

const lands =
  '"lands" is vague. A plain word says what happens. Fix: say `merged`, `deployed` or `released`, or put a literal use in a code span.';

const directoryWith = (files: Readonly<Record<string, string>>, context: test.TestContext) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-prose-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), content);
  }

  return directory;
};

const run = (directory: string, ...args: ReadonlyArray<string>) =>
  spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: "utf8" });

await test("reports each problem once by file and line, skipping symlinks and node_modules", (context) => {
  const directory = directoryWith(
    {
      "README.md": "# Readme\n\nIt lands.\n",
      "docs/guide.md": "One — two.\n",
      "node_modules/pkg/README.md": "It lands.\n",
    },
    context,
  );

  symlinkSync("README.md", join(directory, "CLAUDE.md"));

  const result = run(directory, "**/*.md", "*.md");

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    `README.md:3: ${lands}\ndocs/guide.md:1: "—" is a dash used as punctuation. A period, comma, colon or parentheses say how the parts relate. Fix: use one of them, or put a literal use in a code span.\n`,
  );
});

await test("holds a file to its budget in Unicode code points", (context) => {
  // 26 code points, 27 UTF-16 units and 36 UTF-8 bytes.
  const directory = directoryWith({ "AGENTS.md": "# Agents\n\nZażółć 😀 gęślą.\n" }, context);

  const within = run(directory, "--budget", "AGENTS.md=26", "*.md");

  assert.equal(within.status, 0, within.stderr);
  assert.equal(within.stdout, "Checked prose in 1 Markdown file.\n");

  const over = run(directory, "--budget", "./AGENTS.md=25", "*.md");

  assert.equal(over.status, 1);
  assert.equal(
    over.stderr,
    "AGENTS.md: 26 characters, over its budget of 25. Raising the budget needs the user. Fix: move a rule into a check or shorten it, and delete rules that a check or the code already holds.\n",
  );
});

await test("fails on a pattern or budget that matches no file", (context) => {
  const directory = directoryWith({ "AGENTS.md": "# Agents\n", "notes/todo.txt": "" }, context);

  const result = run(directory, "--budget", "README.md=100", "*.md", "docs/*.md", "notes");

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    "docs/*.md: matches no file. The pattern checks nothing. Fix: correct the pattern or remove it.\nnotes: matches no file. The pattern checks nothing. Fix: correct the pattern or remove it.\nREADME.md: has a budget, but no pattern matches it. The budget checks nothing. Fix: correct the path or add a pattern that matches it.\n",
  );
});

await test("rejects a budget without a character count", (context) => {
  const directory = directoryWith({ "AGENTS.md": "# Agents\n" }, context);

  const result = run(directory, "--budget", "AGENTS.md", "*.md");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--budget AGENTS\.md is not <file>=<characters>\./);
});
