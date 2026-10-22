# @kutur-kit/audit

## 0.1.0-alpha.2

### Minor Changes

- 38d99e2: The Drizzle adapters require `drizzle-orm` 1.0.0-rc.5, which supports Effect 4 without a patch. Remove the `drizzle-orm@1.0.0-rc.4` patch from `patchedDependencies` when upgrading.

## 0.1.0-alpha.1

### Patch Changes

- c6b3838: Copy digest input into an ArrayBuffer-backed Uint8Array so the Web Crypto fallback type-checks in browser projects.

## 0.1.0-alpha.0

### Minor Changes

- 9ff8769: First alpha release.
