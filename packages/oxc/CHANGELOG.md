# @kutur-kit/oxc

## 0.1.0-alpha.3

### Minor Changes

- cc08b1e: `/effect` warns on runtime globals that have an Effect service (`console`, `Date`, `fetch`, `Math.random`, timers, `crypto.randomUUID` and `process.env`) and on `Context.Service` used as a value instead of a class.
- cc08b1e: `/anti-slop` reports vague words such as `lands` or `leverage` and dashes used as punctuation in comments, through the new `kit/comment-prose` rule. The new `kit-prose` command reports the same in Markdown files and can hold a file to a character budget. When upgrading, reword what the rule reports, or put a literal use in a code span.
- cc08b1e: `/base` reports suppression comments that do not name their rules and give a reason, through the new `kit/no-suppression-directives` rule. It also enables `unicorn/no-abusive-eslint-disable`, `typescript/ban-ts-comment` (a `@ts-expect-error` with a description passes) and `reportUnusedDisableDirectives: "error"`. When upgrading, give each `oxlint-disable`, `eslint-disable` and `@effect-diagnostics` comment its rules and a reason after `--` and describe each `@ts-expect-error`. Otherwise delete the comments and fix what they hid.

## 0.1.0-alpha.2

### Minor Changes

- 829c058: Requires Oxlint 1.91, Oxfmt 0.77 and `@effect/tsgo` 0.67. The anti-slop rules use `@oxlint/plugins` 1.91. Type-aware rules run on tsrs or `oxlint-tsgolint`; the READMEs show how to run each without patching `node_modules`.

## 0.1.0-alpha.1

### Minor Changes

- 38d99e2: Requires Oxlint 1.89, Oxfmt 0.74 and `@effect/tsgo` 0.56. The anti-slop rules use `@oxlint/plugins` 1.89.

## 0.1.0-alpha.0

### Minor Changes

- 9ff8769: First alpha release.
