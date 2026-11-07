// Comment directives as Oxlint, ESLint and tsgo read them.

// Oxlint honours a directive only at the start of a comment. A JSDoc comment starts with `*`, so
// Oxlint ignores a directive there. `text` holds the rule list and the reason.
export const lintDirective =
  /^\s*(?:oxlint|eslint)-(?:(?<disable>disable(?:-next-line|-line)?)|enable)(?=\s|$)(?<text>[\s\S]*)/;

// tsgo honours `@effect-diagnostics` anywhere in a comment, JSDoc included. It also reads string
// literals, which kit's rules do not check. A directive runs to the end of its line or to the next
// `@effect-diagnostics`, so a second directive on the same line cannot hide in the first one's
// reason.
export const effectDirective =
  /@effect-diagnostics(?:-next-line)?(?=\s|$)(?<text>(?:(?!@effect-diagnostics)[^\n])*)/g;

// The reason follows ` -- `; neither tool reads it as a rule.
export const reasonSeparator = /\s--\s/;
