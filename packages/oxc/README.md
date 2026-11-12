# @kutur-kit/oxc

Oxlint and Oxfmt presets for TypeScript, with optional Effect and `@kutur-kit/foldkit-stylex` rules.

| Export            | Required tools                                 |
| ----------------- | ---------------------------------------------- |
| `/base`           | `oxlint`, a type-aware backend                 |
| `/effect`         | `oxlint`, `@effect/tsgo`, a type-aware backend |
| `/format`         | `oxfmt`                                        |
| `/anti-slop`      | `oxlint`                                       |
| `/foldkit-stylex` | `oxlint`, `@stylexjs/eslint-plugin`            |

The type-aware backend is [tsrs](https://github.com/oxc-project/tsrs) or `oxlint-tsgolint`.

## Linting

`oxlint.config.ts`:

```ts
import antiSlop from "@kutur-kit/oxc/anti-slop";
import effect from "@kutur-kit/oxc/effect";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [effect, antiSlop],
  options: { typeAware: true, maxWarnings: 0 },
});
```

Install the required tools in `devDependencies` and include linted files in your tsconfig. Run Oxlint for each preset:

| Preset    | With tsrs                                                   | With `oxlint-tsgolint` |
| --------- | ----------------------------------------------------------- | ---------------------- |
| `/base`   | `OXLINT_TSGOLINT_PATH=node_modules/.bin/tsrs-lint oxlint .` | `oxlint .`             |
| `/effect` | `effect-tsgo --tsrs-lint oxlint .`                          | `effect-tsgo oxlint .` |

`effect-tsgo` runs Oxlint with the Effect rules without patching `node_modules`. Check [supported tool versions](https://github.com/Effect-TS/tsgo#supported-package-versions) when upgrading.

`/effect` also warns where code uses a runtime global that has an Effect service, such as `console`, `Date` or `process.env`. Its rules warn, so set `maxWarnings: 0` to fail on them. Turn a rule off with `overrides` only for files where the global is the point, such as a script that prints its result.

In test files (`*.test.*`, `*.spec.*`, `test/**` and `tests/**`), `/effect` also reports manual Effect runners: `Effect.runPromise`, `Effect.runSync` and the other `run*` functions, their `*With` forms and the runners of a `ManagedRuntime` made in the same file. Run effects in tests with `it.effect` from `@effect/vitest`, which provides `TestClock`, and provide services with Layers. The rule also reports runners at module scope: compute a value that a test file needs before its tests run, such as an environment flag, in `vitest.config.ts` and read it with Vitest's `provide` and `inject`.

`/anti-slop` is optional and includes the generic and Effect rules from [anti-slop](https://github.com/dmmulroy/anti-slop), and `kit/comment-prose` (see [Prose](#prose)).

### @kutur-kit/foldkit-stylex

`/foldkit-stylex` checks what the types of `@kutur-kit/foldkit-stylex` cannot see:

- a second Class on an element, or a Class or Style that replaces a @foldkit/ui part's, on a bundle `toView` hands out or `DragAndDropStyle.draggable` returns, or in a `*Attributes` view input;
- a @foldkit/ui view used unstyled, in place of the theme's namespace, such as `Listbox` from `@kutur-kit/foldkit-stylex-theme/listbox`, or a view wrapped with `XStyle.view` for a look of your own;
- StyleX condition keys that never match or that rank differently than written, such as `:focus-visible` or `:has(:focus-visible)` next to `:hover` or `:user-invalid`;
- `:hover` styles outside `@media (hover: hover)`, which touch browsers keep after a tap;
- `createTheme`, `--fks-*` tokens set on an element, theme overrides without `satisfies ThemeOverrides`, styles objects annotated or cast with `as`, and arrays of them annotated, cast or typed as a parameter;
- StyleX's own Vite plugin.

It also turns on StyleX's ESLint rules. Each message names the fix. Add `@stylexjs/eslint-plugin` to your `devDependencies` beside Oxlint, then extend the preset in `oxlint.config.ts`:

```ts
import effect from "@kutur-kit/oxc/effect";
import foldkitStylex from "@kutur-kit/oxc/foldkit-stylex";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [effect, foldkitStylex],
  options: { typeAware: true, maxWarnings: 0 },
});
```

Or in `.oxlintrc.json`, which extends configs by path:

```json
{
  "extends": ["./node_modules/@kutur-kit/oxc/dist/foldkit-stylex.json"]
}
```

The rules recognise `sx`, the `XStyle` namespaces, StyleX, Effect and @foldkit/ui by their imports, named, aliased or as a namespace, and read each file on its own. They recognise @foldkit/ui parts by the names `toView`, `entryToView`, `toCalendarView` and `*Attributes`, so an app's own Submodel that uses those names is checked as a @foldkit/ui part. They follow bundles through `map`, `flatMap` and `filter` written in place, as array methods, Effect `Array` functions or `pipe` steps.

They miss a @foldkit/ui view, a `create()` result or a styled draggable that reaches the file through another module, a bundle kept in a variable or iterated another way, a Class that a helper adds to a bundle passed to it, and a `*Attributes` input whose `childAttributes([...])` call is not written in place.

### Suppression comments

`kit/no-suppression-directives` reports comments that suppress Oxlint rules or Effect diagnostics, reading `oxlint-disable`, `eslint-disable` and `@effect-diagnostics` as Oxlint and tsgo read them. With `{ allowWithReason: true }`, as `/base` sets it, a comment passes when it names each rule and gives a reason after `--`:

```ts
// oxlint-disable-next-line no-debugger -- the page demonstrates the debugger
// @effect-diagnostics-next-line floatingEffect:off -- the test asserts the type only
```

Blanket comments, `*:off`, `skip-file` and comments that disable `unicorn/no-abusive-eslint-disable` or `typescript/ban-ts-comment` still fail. Without the option, every suppression fails. `@ts-*` comments are left to `typescript/ban-ts-comment`.

A comment that disables `kit/no-suppression-directives` itself turns the rule off for its file, so the comment suppresses nothing and `reportUnusedDisableDirectives` fails on it. `/base` sets that option to `"error"`. Your own `options` merge with the preset's, so it stays on unless you override it.

tsgo also reads `@effect-diagnostics` in string literals, which the rule does not check.

### Functions sent to a page

`kit/self-contained-function` reports an exported function that reads a binding of its own module other than a type, such as a helper, a constant or an import. Playwright's `page.evaluate` and `page.addInitScript` send a function to the page as source, where those bindings do not exist. No preset turns it on. With `/base` or `/effect`, enable it for the modules that export such functions:

```ts
export default defineConfig({
  extends: [effect],
  overrides: [{ files: ["src/testing.ts"], rules: { "kit/self-contained-function": "error" } }],
});
```

It checks functions exported where they are declared, not ones exported later with `export { name }`, and reads each module on its own.

## Prose

`kit/comment-prose`, which `/anti-slop` turns on, checks comments. The `kit-prose` command checks Markdown. Both report vague words such as `lands`, `gated` or `leverage`, and dashes used as punctuation: an em dash anywhere, or an en dash, `-` or `--` with a space on each side. Each message names the fix. Put a literal use, such as an identifier, in a code span.

Code spans, fenced code, URLs, link targets, autolinks and HTML comments are not checked. In comments, JSDoc margins and a directive's keyword and rules, up to the `--` before its reason, are skipped too; the reason is checked. String literals are never checked, so product copy can use a spaced en dash.

`kit-prose` expands quoted glob patterns and skips symlinks and `node_modules`:

```sh
kit-prose --budget AGENTS.md=7400 '*.md' 'packages/*/README.md'
```

It prints each problem as `<file>:<line>` and exits with 1 on any failure. `--budget <file>=<characters>` fails when the file has more characters than the limit, counted as Unicode code points. A budget whose file no pattern matches fails, and so does a pattern that matches no file, so a typo cannot switch a check off.

## Formatting

`oxfmt.config.ts`:

```ts
import format from "@kutur-kit/oxc/format";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...format,
  ignorePatterns: ["**/dist/**", "**/coverage/**"],
});
```
