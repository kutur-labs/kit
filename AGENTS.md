# Repository guidance

Kutur Kit is a collection of independent, composable Effect-native TypeScript libraries. See `DRAFT_SPEC.md` for the proposed architecture and roadmap; it does not describe completed functionality.

## Package management

- Use the exact Node.js version in `.node-version` for development and CI. Keep the root `engines.node` pin in sync; prefer the latest patch of an LTS line. Published libraries should declare their own tested runtime compatibility ranges rather than copying the repository's development pin.
- Always use pnpm. Use the exact version pinned in the root `packageManager` field. Do not use npm, Yarn, Bun's package manager or alternate lockfiles.
- Keep `pnpm-lock.yaml` in version control. Run `pnpm install` after manifest or catalog changes and `pnpm install --frozen-lockfile` for reproducible verification and CI.
- Centralize external dependency versions in `pnpm-workspace.yaml`. Package manifests must reference `catalog:<name>` instead of repeating external versions.
- Pin installed dependencies to exact versions, including prereleases. Do not use `latest`, `*`, caret or tilde ranges for runtime, tooling, testing or example installs.
- Peer compatibility ranges are the deliberate exception: they describe supported consumer versions, not the version installed for development.
- Use `workspace:*` for local runtime/dev dependencies and `workspace:^` for local peer compatibility. Do not use relative `file:` links or registry versions to consume another workspace package.
- Use `pnpm exec` for installed tools. If a one-off tool is necessary, use `pnpm dlx <tool>@<exact-version>`.

## Catalogs and dependency ownership

Create named catalogs only when they have a consumer. The catalog chooses a version; the manifest field determines dependency ownership.

| Catalog | Contents | Manifest usage |
| --- | --- | --- |
| `runtime` | Exact versions of runtime libraries and local development copies of peers | `dependencies`, or `devDependencies` when testing a peer |
| `tooling` | Exact versions of compilers, linters, formatters and build tools | `devDependencies` |
| `testing` | Exact versions of test runners, coverage tools and test-only helpers | `devDependencies` |
| `examples` | Exact versions of dependencies used only by demos or example apps | Example `dependencies` or `devDependencies`, according to use |
| `peers` | Intentional, tested compatibility ranges for consumer-provided libraries | Published library `peerDependencies` only |

- A library's `dependencies` contain what its implementation needs at runtime. Keep test tools, example frameworks and development tooling out of published runtime dependencies.
- Use `peerDependencies` for ecosystem packages the consumer must provide, such as Effect when it is part of the public API. Also declare an exact development copy via `catalog:runtime` in that library's `devDependencies` so it can build and test independently.
- Mark a peer optional in `peerDependenciesMeta` only when its integration is genuinely optional. Core imports must work without it.
- Examples and apps are private consumers. They declare their actual runtime dependencies in `dependencies`, including the peers required by the libraries they use. Reuse `catalog:runtime` for shared libraries; use `catalog:examples` only for example-only dependencies rather than duplicating versions.
- Tests and fixtures use their owning package's `devDependencies` and `catalog:testing`. A standalone test workspace must be private and declare its own dependencies.
- Declare a tool in each package that invokes it. The root holds repository-wide orchestration tools, not dependencies that packages silently borrow.
- Do not widen peer ranges beyond verified compatibility or use an exact runtime catalog pin as a published peer range. Use distinct named peer catalogs if packages intentionally support different compatibility lines.

To add a dependency, first add its exact version (or peer compatibility range) to the appropriate catalog, then add `"<dependency>": "catalog:<name>"` to the owning manifest and run `pnpm install`. `catalogMode: strict` helps `pnpm add` use catalogs, but does not replace review of manually edited manifests.

## Workspace and tasks

- `packages/*`: publishable `@kutur-kit/*` libraries and shared configurations.
- `apps/*`: private applications, including documentation.
- `examples/*`: private, independently runnable examples.
- `tooling/*`: private repository tooling packages.
- Use one package per direct child directory. Add packages when implementing them; do not create empty publishable stubs.
- Package scripts run their own tools; root scripts orchestrate them through Turbo. Never call the root Turbo wrapper from a package task.
- Use `build`, `dev`, `lint`, `typecheck` and `test` consistently. Tests used by `pnpm test` must finish rather than enter watch mode.
- Default builds emit to `dist/`. Override Turbo outputs in package configuration when a framework uses another output directory.
- Keep Turbo cache inputs and environment declarations accurate. Add package-specific environment inputs as integrations are introduced. Tasks with external side effects or live-service tests must not be cached.
- Run `pnpm build` and `pnpm check` for implemented packages affected by a change. With no package implementations yet, these commands validate orchestration but run no package tasks.
