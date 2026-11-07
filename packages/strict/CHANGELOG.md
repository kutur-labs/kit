# @kutur-kit/strict

## 0.2.0-alpha.1

### Minor Changes

- 3918831: `pnpm install` fails when a script has the name of a pnpm command, such as `deploy`, because `pnpm deploy` runs pnpm's command instead of the script. When upgrading, rename such scripts. Scripts that pnpm runs by name pass; `clean`, `purge`, `rebuild`, `rb` and `tasks` in a workspace package pass only when the root has the same script.

## 0.2.0-alpha.0

### Minor Changes

- 2825085: Fails installs when a `minimumReleaseAgeExclude` entry is not one package name with exact versions, or `minimumReleaseAgeExcludePrune` is not `true`. Each reported problem now says why it fails the install and how to fix it. `findViolations` is renamed to `findCatalogViolations`.

## 0.1.0

- Adds a pnpm hook that fails installs when a workspace dependency bypasses the catalogs or uses a catalog entry that is not an exact version.
