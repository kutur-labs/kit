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

Effect diagnostics require TypeScript 7 and a compatible `@effect/tsgo` in `devDependencies`. Run `pnpm exec effect-tsgo patch` after installation and use the workspace TypeScript SDK in your editor.
