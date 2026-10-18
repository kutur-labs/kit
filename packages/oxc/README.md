# @kutur-kit/oxc

Oxlint and Oxfmt presets for TypeScript, with optional Effect rules.

| Export       | Required tools                              |
| ------------ | ------------------------------------------- |
| `/base`      | `oxlint`, `oxlint-tsgolint`                 |
| `/effect`    | `oxlint`, `oxlint-tsgolint`, `@effect/tsgo` |
| `/format`    | `oxfmt`                                     |
| `/anti-slop` | `oxlint`                                    |

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

Install the required tools in `devDependencies` and include linted files in your tsconfig. For Effect rules, run `pnpm exec effect-tsgo patch --oxlint` after installation. Check [supported tool versions](https://github.com/Effect-TS/tsgo#supported-package-versions) when upgrading.

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
