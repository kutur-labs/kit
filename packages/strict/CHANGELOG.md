# @kutur-kit/strict

## 0.2.0-alpha.0

### Minor Changes

- 2825085: Fails installs when a `minimumReleaseAgeExclude` entry is not one package name with exact versions, or `minimumReleaseAgeExcludePrune` is not `true`. Each reported problem now says why it fails the install and how to fix it. `findViolations` is renamed to `findCatalogViolations`.

## 0.1.0

- Adds a pnpm hook that fails installs when a workspace dependency bypasses the catalogs or uses a catalog entry that is not an exact version.
