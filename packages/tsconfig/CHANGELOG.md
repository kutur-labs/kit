# @kutur-kit/tsconfig

## 0.1.0-alpha.2

### Patch Changes

- e0a1733: Requires Oxlint 1.94, Oxfmt 0.79 and `@effect/tsgo` 0.70. The anti-slop rules use `@oxlint/plugins` 1.94. Type-aware rules run on tsrs alone: Oxlint finds an installed tsrs, so `/base` runs as `oxlint .`, and the READMEs no longer cover `oxlint-tsgolint` or TypeScript 7. `/effect` gains the two rules `@effect/tsgo` 0.70 adds to its recommended preset: `effecttsgo/on-exit-failure-to-on-error` and `effecttsgo/flat-map-provide-service-to-provide-service-effect`.

## 0.1.0-alpha.1

### Patch Changes

- 829c058: Requires Oxlint 1.91, Oxfmt 0.77 and `@effect/tsgo` 0.67. The anti-slop rules use `@oxlint/plugins` 1.91. Type-aware rules run on tsrs or `oxlint-tsgolint`; the READMEs show how to run each without patching `node_modules`.

## 0.1.0-alpha.0

### Minor Changes

- 9ff8769: First alpha release.
