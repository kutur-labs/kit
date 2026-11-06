# @kutur-kit/oxc

Oxlint and Oxfmt presets for TypeScript, with optional Effect rules.

| Export       | Required tools                                 |
| ------------ | ---------------------------------------------- |
| `/base`      | `oxlint`, a type-aware backend                 |
| `/effect`    | `oxlint`, `@effect/tsgo`, a type-aware backend |
| `/format`    | `oxfmt`                                        |
| `/anti-slop` | `oxlint`                                       |

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

### Suppression comments

`kit/no-suppression-directives` reports comments that suppress Oxlint rules or Effect diagnostics, reading `oxlint-disable`, `eslint-disable` and `@effect-diagnostics` as Oxlint and tsgo read them. With `{ allowWithReason: true }`, as `/base` sets it, a comment passes when it names each rule and gives a reason after `--`:

```ts
// oxlint-disable-next-line no-debugger -- the page demonstrates the debugger
// @effect-diagnostics-next-line floatingEffect:off -- the test asserts the type only
```

Blanket comments, `*:off`, `skip-file` and comments that disable `unicorn/no-abusive-eslint-disable` or `typescript/ban-ts-comment` still fail. Without the option, every suppression fails. `@ts-*` comments are left to `typescript/ban-ts-comment`.

A comment that disables `kit/no-suppression-directives` itself turns the rule off for its file, so the comment suppresses nothing and `reportUnusedDisableDirectives` fails on it. `/base` sets that option to `"error"`. Your own `options` merge with the preset's, so it stays on unless you override it.

tsgo also reads `@effect-diagnostics` in string literals, which the rule does not check.

`/anti-slop` is optional and includes the generic and Effect rules from [anti-slop](https://github.com/dmmulroy/anti-slop).

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
