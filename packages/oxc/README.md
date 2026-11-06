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
