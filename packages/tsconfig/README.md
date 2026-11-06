# @kutur-kit/tsconfig

Strict TypeScript presets with optional Effect diagnostics.

- `base.json`: TypeScript only.
- `effect.json`: TypeScript with Effect diagnostics.

```json
{
  "extends": "@kutur-kit/tsconfig/effect.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

Set output paths and declaration options in your tsconfig. Add any required runtime types through `compilerOptions.types`; the presets include none by default.

Effect diagnostics require a compatible `@effect/tsgo` in `devDependencies` and a compiler it supports: [tsrs](https://github.com/oxc-project/tsrs) or TypeScript 7. Type-check through it, without patching `node_modules`:

```sh
effect-tsgo tsrs -p tsconfig.json --noEmit
```

`effect-tsgo tsc` does the same with TypeScript 7.
