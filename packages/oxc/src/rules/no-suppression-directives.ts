import { defineRule } from "@oxlint/plugins";

const thisRule = "no-suppression-directives";

// Rules that keep the remaining suppressions visible. Suppressing them reopens what this rule closes.
const fenceRules = ["no-abusive-eslint-disable", "ban-ts-comment"];

// Oxlint honours a disable directive only at the start of a comment. A JSDoc comment starts with
// `*`, so Oxlint ignores a directive there and so does this rule.
const lintDisableKeyword = /^\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?(?=\s|$)/;

// tsgo honours `@effect-diagnostics` anywhere in a comment, JSDoc included. It also reads string
// literals, which this rule does not check. A directive runs to the end of its line or to the next
// `@effect-diagnostics`, so a second directive on the same line cannot hide in the first one's
// reason.
const effectDirective =
  /@effect-diagnostics(?:-next-line)?(?=\s|$)(?<text>(?:(?!@effect-diagnostics)[^\n])*)/g;

// An Effect entry that sets one diagnostic to a level, such as `floatingEffect:off`. `*:off` and
// `skip-file` do not match.
const effectRuleLevel = /^[\w-]+:(?:off|warning|error|message|suggestion)$/;

// The reason follows ` -- `; neither tool reads it as a rule.
const reasonSeparator = /\s--\s/;

// Oxlint splits a rule list on whitespace and commas, tsgo on whitespace.
const lintRuleSeparator = /[\s,]+/;

const effectEntrySeparator = /\s+/;

type Directive =
  | { readonly kind: "lint-disable"; readonly rules: string[]; readonly reason: string }
  | { readonly kind: "effect-diagnostics"; readonly entries: string[]; readonly reason: string };

// A type alias, unlike an interface, is assignable to `JsonObject`, so `context.options` can be
// asserted to it.
type Options = { readonly allowWithReason: boolean };

type MessageId = "suppression" | "unexplained" | "fence";

const splitReason = (text: string) => {
  const separator = reasonSeparator.exec(text);

  return separator === null
    ? { list: text, reason: "" }
    : {
        list: text.slice(0, separator.index),
        reason: text.slice(separator.index + separator[0].length).trim(),
      };
};

const words = (list: string, separator: RegExp) =>
  list.split(separator).filter((word) => word !== "");

const directivesIn = (comment: string): Directive[] => {
  const effect = Array.from(comment.matchAll(effectDirective), (match): Directive => {
    const { list, reason } = splitReason(match.groups?.text ?? "");

    return { kind: "effect-diagnostics", entries: words(list, effectEntrySeparator), reason };
  });

  const lintKeyword = lintDisableKeyword.exec(comment);

  if (lintKeyword === null) return effect;

  const { list, reason } = splitReason(comment.slice(lintKeyword[0].length));

  return [{ kind: "lint-disable", rules: words(list, lintRuleSeparator), reason }, ...effect];
};

// A rule id may carry any plugin prefix, such as `kit/` or an alias the consumer chose.
const includesRule = (rules: string[], rule: string) =>
  rules.some((id) => id === rule || id.endsWith(`/${rule}`));

const namesEachRule = (directive: Directive) =>
  directive.kind === "lint-disable"
    ? directive.rules.length > 0
    : directive.entries.length > 0 &&
      directive.entries.every((entry) => effectRuleLevel.test(entry));

const violation = (directive: Directive, allowWithReason: boolean): MessageId | undefined => {
  if (!allowWithReason) return "suppression";

  if (
    directive.kind === "lint-disable" &&
    fenceRules.some((fence) => includesRule(directive.rules, fence))
  ) {
    return "fence";
  }

  return namesEachRule(directive) && directive.reason !== "" ? undefined : "unexplained";
};

export const noSuppressionDirectives = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow comments that suppress lint rules or Effect diagnostics, or allow only those that name their rules and give a reason.",
    },
    schema: [
      {
        type: "object",
        properties: { allowWithReason: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowWithReason: false }],
    messages: {
      suppression:
        "Suppression comment. It hides a finding instead of fixing its cause. Fix: delete the comment and fix the finding.",
      unexplained:
        "Suppression comment without named rules and a reason. A blanket or unexplained suppression also hides later findings. Fix: name each rule (`rule:level` for `@effect-diagnostics`) and append ` -- <reason>`, or delete the comment and fix the finding.",
      fence:
        "Suppression of `no-abusive-eslint-disable` or `ban-ts-comment`. These rules keep the other suppressions visible. Fix: delete the comment and fix what the rule reports.",
    },
  },
  createOnce(context) {
    return {
      Program() {
        // SAFETY: Oxlint validates the options against `meta.schema` and merges them over
        // `meta.defaultOptions`, so the first one is a complete `Options`.
        const { allowWithReason } = context.options[0] as Options;

        const comments = context.sourceCode
          .getAllComments()
          .map((comment) => ({ comment, directives: directivesIn(comment.value) }));

        // A disable directive naming this rule would hide its reports. Reporting nothing leaves
        // that directive unused, and `reportUnusedDisableDirectives` fails on it instead.
        if (
          comments.some(({ directives }) =>
            directives.some(
              (directive) =>
                directive.kind === "lint-disable" && includesRule(directive.rules, thisRule),
            ),
          )
        ) {
          return;
        }

        for (const { comment, directives } of comments) {
          const messageId = directives
            .map((directive) => violation(directive, allowWithReason))
            .find((id) => id !== undefined);

          if (messageId !== undefined) context.report({ node: comment, messageId });
        }
      },
    };
  },
});
