/** A vague word or a dash used as punctuation, at a UTF-16 offset into the checked text. */
export type ProseProblem = {
  readonly index: number;
  readonly text: string;
  readonly message: string;
};

type Rule = { readonly pattern: RegExp; readonly message: string };

const vague = (pattern: RegExp, fix: string): Rule => ({
  pattern,
  message: `is vague. A plain word says what happens. Fix: ${fix}, or put a literal use in a code span.`,
});

const rules: ReadonlyArray<Rule> = [
  vague(/\b(?:stamp|stamps|stamped|stamping)\b/giu, "say who records or approves it"),
  vague(/\b(?:land|lands|landed)\b/giu, "say `merged`, `deployed` or `released`"),
  vague(/\b(?:gate|gates|gated|gating)\b/giu, "say what checks, blocks or requires it"),
  vague(/\b(?:unlock|unlocks|unlocked|unlocking)\b/giu, "say what it allows"),
  vague(/\b(?:supercharge|supercharges|supercharged)\b/giu, "say what changes"),
  vague(/\b(?:seamless|seamlessly)\b/giu, "delete it or say what keeps working"),
  vague(/\bbattle-tested\b/giu, "say where it runs or what tests it"),
  vague(/\b(?:leverage|leverages|leveraged|leveraging)\b/giu, "say `use`"),
  vague(/\b(?:empower|empowers|empowered|empowering)\b/giu, "say `lets` or `supports`"),
  {
    // An em dash (U+2014) anywhere. An en dash (U+2013), `-` or `--` only between spaces, so
    // ranges such as `2–4`, hyphenated words, flags and list items pass.
    pattern: /\u2014|(?<=\S )(?:\u2013|--?)(?= \S)/gu,
    message:
      "is a dash used as punctuation. A period, comma, colon or parentheses say how the parts relate. Fix: use one of them, or put a literal use in a code span.",
  },
];

/**
 * Replaces every character but line breaks with a space, so offsets and line numbers still point
 * into the source. Without the `u` flag the pattern matches UTF-16 units, so a character outside
 * the BMP becomes two spaces.
 */
export const blank = (span: string) => span.replaceAll(/[^\n]/g, " ");

// Fenced code, indented in a list item or not, and HTML comments.
const block =
  /^[ \t]*(?<fence>(?<char>[`~])\k<char>{2,})[^\n]*\n[\s\S]*?^[ \t]*\k<fence>\k<char>*[ \t]*$|<!--[\s\S]*?-->/gmu;

// Code spans, link targets, autolinks and bare URLs.
const inline = /(?<ticks>`+)[^\n]*?\k<ticks>|\]\([^)\n]*\)|<https?:[^>\n]*>|https?:\/\/\S+/gu;

// U+FFFC instead of a space, so a dash next to a code span or link still has a non-space
// neighbour. None of the inline spans holds a line break.
const mark = (span: string) => "\uFFFC".repeat(span.length);

/**
 * Finds vague words and dashes used as punctuation in Markdown or comment text. Fenced code, HTML
 * comments, code spans, link targets, autolinks and URLs are not prose.
 */
export const proseProblems = (text: string): ReadonlyArray<ProseProblem> => {
  const prose = text.replaceAll(block, blank).replaceAll(inline, mark);

  return rules
    .flatMap(({ pattern, message }) =>
      Array.from(prose.matchAll(pattern), (match) => ({
        index: match.index,
        text: match[0],
        message,
      })),
    )
    .sort((a, b) => a.index - b.index);
};
