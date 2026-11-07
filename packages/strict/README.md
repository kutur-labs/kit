# @kutur-kit/strict

A pnpm hook that requires exact catalog versions for workspace dependencies and exact release-age exclusions. It fails `pnpm install`, including frozen installs in CI, when:

- `dependencies`, `devDependencies` or `optionalDependencies` use a version that is not `catalog:` or `workspace:`;
- a catalog entry used by those fields is not an exact version. Exact npm aliases such as `npm:@scope/ui@1.2.3` pass;
- a `minimumReleaseAgeExclude` entry is not one package name with an exact version, as `name@1.2.3`. Name patterns such as `@scope/*`, `!name` or `name?` also exempt other packages. Bare names, ranges and tags also exempt versions published later. `name@1.2.3 || 1.2.4`, which pnpm writes for several versions of one package, passes;
- `minimumReleaseAgeExcludePrune` is not `true`. pnpm adds exclusions on its own; with this setting it removes them once the lockfile no longer uses those versions.

`peerDependencies` may use any range, directly or through a catalog that only peers use. The hook checks the root `package.json` and every workspace package. It reports all problems at once.

## Setup

Tested with pnpm 12 and Node.js 26. Add the package as a config dependency:

```sh
pnpm add --config @kutur-kit/strict@alpha
```

Then load its pnpmfile and turn on exclusion pruning in `pnpm-workspace.yaml`:

```yaml
pnpmfile:
  - node_modules/.pnpm-config/@kutur-kit/strict/pnpmfile.mjs

minimumReleaseAgeExcludePrune: true
```

Setting `pnpmfile` replaces the default `.pnpmfile.mjs`; list it too if the workspace has one. The lockfile records a checksum of every pnpmfile, so upgrading the hook also updates `pnpm-lock.yaml`.

## Limitations

`overrides` and `packageExtensions` in `pnpm-workspace.yaml` may still use ranges.
