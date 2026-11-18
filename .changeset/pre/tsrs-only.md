---
"@kutur-kit/oxc": minor
"@kutur-kit/tsconfig": patch
"@kutur-kit/foldkit-stylex": patch
---

Requires Oxlint 1.94, Oxfmt 0.79 and `@effect/tsgo` 0.70. The anti-slop rules use `@oxlint/plugins` 1.94. Type-aware rules run on tsrs alone: Oxlint finds an installed tsrs, so `/base` runs as `oxlint .`, and the READMEs no longer cover `oxlint-tsgolint` or TypeScript 7. `/effect` gains the two rules `@effect/tsgo` 0.70 adds to its recommended preset: `effecttsgo/on-exit-failure-to-on-error` and `effecttsgo/flat-map-provide-service-to-provide-service-effect`.
