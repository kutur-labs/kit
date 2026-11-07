import assert from "node:assert/strict";
import { test } from "node:test";

import { proseProblems } from "../src/prose/problems.ts";

// Each problem as `<line>:<offset in its line> <text>`.
const found = (text: string) =>
  proseProblems(text).map(({ index, text: match }) => {
    const before = text.slice(0, index).split("\n");

    return `${before.length}:${before.at(-1)?.length} ${match}`;
  });

await test("reports every listed word form, in any case", () => {
  const forms = [
    "stamp",
    "stamps",
    "stamped",
    "stamping",
    "land",
    "lands",
    "landed",
    "gate",
    "gates",
    "gated",
    "gating",
    "unlock",
    "unlocks",
    "unlocked",
    "unlocking",
    "supercharge",
    "supercharges",
    "supercharged",
    "seamless",
    "seamlessly",
    "battle-tested",
    "leverage",
    "leverages",
    "leveraged",
    "leveraging",
    "empower",
    "empowers",
    "empowered",
    "empowering",
  ];

  for (const form of forms) assert.deepEqual(found(`It ${form} here.`), [`1:3 ${form}`]);

  assert.deepEqual(found("Landed."), ["1:0 Landed"]);
});

await test("reports dashes used as punctuation", () => {
  for (const [text, expected] of [
    ["one — two", ["1:4 —"]],
    ["one—two", ["1:3 —"]],
    ["one – two", ["1:4 –"]],
    ["one - two", ["1:4 -"]],
    ["one -- two", ["1:4 --"]],
  ] as const) {
    assert.deepEqual(found(text), expected, text);
  }
});

await test("passes words that contain a listed word, hyphens, ranges, flags and list items", () => {
  for (const text of [
    "A timestamp, a gateway, a landing page, an island and Poland.",
    "Pages 2–4 use kebab-case.",
    "Run pnpm install --frozen-lockfile.",
    "- a list item\n  - a nested item",
    "Dziwne rzeczy dla ludzi, którzy je rozumieją.",
  ]) {
    assert.deepEqual(found(text), [], text);
  }
});

await test("skips code spans, link targets, autolinks and URLs", () => {
  assert.deepEqual(
    found(
      "The `gate` option, ``a ` gate``, [the docs](./gate.md), <https://example.com/gate> and https://example.com/landed.",
    ),
    [],
  );
});

await test("still reports a spaced dash next to a code span, link or URL", () => {
  for (const [text, expected] of [
    ["`foo` - bar", ["1:6 -"]],
    ["[Foldkit](https://foldkit.dev) – renders", ["1:31 –"]],
    ["<https://foldkit.dev> - renders", ["1:22 -"]],
    ["https://foldkit.dev -- renders", ["1:20 --"]],
  ] as const) {
    assert.deepEqual(found(text), expected, text);
  }
});

await test("skips fenced code, indented or not, and HTML comments", () => {
  const markdown = [
    "```sh",
    "git commit -m 'it lands'",
    "```",
    "- Install:",
    "",
    "  ~~~~",
    "  gated",
    "  ~~~~~",
    "",
    "\t```",
    "\tleverage",
    "\t```",
    "<!-- unlocked -->",
    "It lands.",
  ].join("\n");

  assert.deepEqual(found(markdown), ["14:3 lands"]);
});

await test("keeps offsets when a skipped span holds a character outside the BMP", () => {
  assert.deepEqual(found("`😀` lands\n```\n😀\n```\nIt — lands"), [
    "1:5 lands",
    "5:3 —",
    "5:5 lands",
  ]);
});

await test("names the fix and the code span in each message", () => {
  assert.deepEqual(proseProblems("It lands — now."), [
    {
      index: 3,
      text: "lands",
      message:
        "is vague. A plain word says what happens. Fix: say `merged`, `deployed` or `released`, or put a literal use in a code span.",
    },
    {
      index: 9,
      text: "—",
      message:
        "is a dash used as punctuation. A period, comma, colon or parentheses say how the parts relate. Fix: use one of them, or put a literal use in a code span.",
    },
  ]);
});
