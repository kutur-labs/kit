# @kutur-kit/oxc

## 0.1.0-alpha.6

### Minor Changes

- 12f43b9: `/foldkit-stylex` reports a `:hover` style outside `@media (hover: hover)`, through the new `kit/foldkit-stylex-hover-gate` rule, because touch browsers keep `:hover` after a tap. Chained keys such as `:hover:not(:focus-visible)` and `stylex.when.*(":hover")` keys count as hover too. When upgrading, write `":hover": { default: null, "@media (hover: hover)": value }`. StyleX takes no condition under a chained or `stylex.when` key, so put that key under `"@media (hover: hover)"` instead.

  `kit/foldkit-stylex-unstyled-view` names the theme's namespace, such as `Listbox` from `@kutur-kit/foldkit-stylex-theme/listbox`, as the first fix for an unwrapped @foldkit/ui view, then the core's wrapper for a look of your own.

- 12f43b9: The new `kit/self-contained-function` rule reports an exported function that reads a binding of its own module other than a type, such as a helper, a constant or an import. Playwright sends such functions to a page as source, where those bindings do not exist. No preset turns it on; enable it in `overrides` for the modules that export functions for `page.evaluate` or `page.addInitScript`.

## 0.1.0-alpha.5

### Minor Changes

- 14e769e: The new `/foldkit-stylex` preset lints apps that use `@kutur-kit/foldkit-stylex`, with StyleX's ESLint rules; `.oxlintrc.json` extends it as `dist/foldkit-stylex.json`. It needs `@stylexjs/eslint-plugin` 0.19, an optional peer.

  `/effect` reports manual Effect runners in test files, module scope included, through the new `kit/no-manual-effect-runtime-in-tests` rule: `Effect.runPromise`, `Effect.runSync`, the other `run*` functions, their `*With` forms and the runners of a `ManagedRuntime`. When upgrading, write those tests with `it.effect` from `@effect/vitest`. Compute a value that a test file needs before its tests run, such as an environment flag, in `vitest.config.ts` and read it with `provide` and `inject`.

### Patch Changes

- 14e769e: `anti-slop/no-shape-in-symbol-names` no longer reports a property key or JSX attribute that names a CSS or SVG property, such as `shapeOutside` in a StyleX style or `shapeRendering` on an SVG element.

## 0.1.0-alpha.4

### Patch Changes

- 75921ca: A `kit-prose` budget failure also says to delete rules that a check or the code already holds.

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
