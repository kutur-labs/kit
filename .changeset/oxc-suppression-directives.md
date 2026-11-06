---
"@kutur-kit/oxc": minor
---

`/base` reports suppression comments that do not name their rules and give a reason, through the new `kit/no-suppression-directives` rule. It also enables `unicorn/no-abusive-eslint-disable`, `typescript/ban-ts-comment` (a `@ts-expect-error` with a description passes) and `reportUnusedDisableDirectives: "error"`. When upgrading, give each `oxlint-disable`, `eslint-disable` and `@effect-diagnostics` comment its rules and a reason after `--` and describe each `@ts-expect-error`. Otherwise delete the comments and fix what they hid.
