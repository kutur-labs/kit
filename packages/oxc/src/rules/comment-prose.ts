import { defineRule } from "@oxlint/plugins";

import { blank, proseProblems } from "../prose/problems.ts";
import { effectDirective, lintDirective, reasonSeparator } from "./directives.ts";

// JSDoc margins are not prose; a list item after one would read as a dash.
const jsdocMargin = /^[ \t]*\*/gm;

// TypeScript reads a `@ts-` directive at the start of a comment. The description after it is prose.
const typeScriptDirective = /^\s*@ts-(?:expect-error|ignore|nocheck)(?:\s--\s)?/;

// Blanks a directive's keyword and rules up to and including the separator, so ` -- ` is not read
// as a dash. The reason after it is prose.
const blankSyntax = (directive: string) => {
  const separator = reasonSeparator.exec(directive);
  const end = separator === null ? directive.length : separator.index + separator[0].length;

  return blank(directive.slice(0, end)) + directive.slice(end);
};

const proseOf = (comment: string) =>
  comment
    .replaceAll(jsdocMargin, blank)
    .replace(lintDirective, blankSyntax)
    .replace(typeScriptDirective, blank)
    .replaceAll(effectDirective, blankSyntax);

export const commentProse = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow vague words and dashes used as punctuation in comments." },
    schema: [],
    messages: { prose: '"{{text}}" {{message}}' },
  },
  createOnce(context) {
    return {
      Program() {
        const { sourceCode } = context;

        for (const comment of sourceCode.getAllComments()) {
          // The value starts after the comment's opening `//` or `/*`.
          const start = comment.range[0] + 2;

          for (const { index, text, message } of proseProblems(proseOf(comment.value))) {
            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(start + index),
                end: sourceCode.getLocFromIndex(start + index + text.length),
              },
              messageId: "prose",
              data: { text, message },
            });
          }
        }
      },
    };
  },
});
