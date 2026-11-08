---
"@kutur-kit/oxc": minor
---

The new `/foldkit-stylex` preset lints apps that use `@kutur-kit/foldkit-stylex`, with StyleX's ESLint rules; `.oxlintrc.json` extends it as `dist/foldkit-stylex.json`. It needs `@stylexjs/eslint-plugin` 0.19, an optional peer.

`/effect` reports manual Effect runners in test files, module scope included, through the new `kit/no-manual-effect-runtime-in-tests` rule: `Effect.runPromise`, `Effect.runSync`, the other `run*` functions, their `*With` forms and the runners of a `ManagedRuntime`. When upgrading, write those tests with `it.effect` from `@effect/vitest`. Compute a value that a test file needs before its tests run, such as an environment flag, in `vitest.config.ts` and read it with `provide` and `inject`.
