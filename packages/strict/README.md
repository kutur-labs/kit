# @kutur-kit/strict

A pnpm hook that requires exact catalog versions for workspace dependencies. It fails `pnpm install`, including frozen installs in CI, when:

- `dependencies`, `devDependencies` or `optionalDependencies` use a version that is not `catalog:` or `workspace:`;
- a catalog entry used by those fields is not an exact version. Exact npm aliases such as `npm:@scope/ui@1.2.3` pass.

`peerDependencies` may use any range, directly or through a catalog that only peers use. The hook checks the root `package.json` and every workspace package. It reports all problems at once.

## Setup

Tested with pnpm 12 and Node.js 26. Add the package as a config dependency and load its pnpmfile in `pnpm-workspace.yaml`:

```yaml
configDependencies:
  "@kutur-kit/strict": 0.1.0

pnpmfile:
  - node_modules/.pnpm-config/@kutur-kit/strict/pnpmfile.mjs
```

Setting `pnpmfile` replaces the default `.pnpmfile.mjs`; list it too if the workspace has one. The lockfile records a checksum of every pnpmfile, so upgrading the hook also updates `pnpm-lock.yaml`.

## Limitations

`overrides` and `packageExtensions` in `pnpm-workspace.yaml` may still use ranges.
