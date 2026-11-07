# @kutur-kit/access

## 0.1.0-alpha.4

### Patch Changes

- e6b2d2b: Imports Effect modules by subpath, so unbundled runs and esbuild bundles load only the modules the package uses.
- Updated dependencies [e6b2d2b]
  - @kutur-kit/audit@0.1.0-alpha.4

## 0.1.0-alpha.3

### Minor Changes

- 829c058: Requires Effect 4.1. Audit entry ids come from Effect's `SecureRandom` service when the app provides one, else Web Crypto; Effect 4.1 replaced the `Crypto` service.

### Patch Changes

- Updated dependencies [829c058]
  - @kutur-kit/audit@0.1.0-alpha.3

## 0.1.0-alpha.2

### Minor Changes

- 38d99e2: The Drizzle adapters require `drizzle-orm` 1.0.0-rc.5, which supports Effect 4 without a patch. Remove the `drizzle-orm@1.0.0-rc.4` patch from `patchedDependencies` when upgrading.

### Patch Changes

- Updated dependencies [38d99e2]
  - @kutur-kit/audit@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [c6b3838]
  - @kutur-kit/audit@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- 9ff8769: First alpha release.

### Patch Changes

- Updated dependencies [9ff8769]
  - @kutur-kit/audit@0.1.0-alpha.0
