# Kutur Kit

## Dependencies

- Use pnpm at the version in `packageManager`. Use `.node-version` for development and CI; keep `engines.node` in sync. Published packages declare their tested Node versions separately.
- Keep external versions in `pnpm-workspace.yaml`; manifests use `catalog:<name>`. Use exact versions except for published peer dependency ranges.
- Use `workspace:*` for local dependencies and `workspace:^` for local peers.
- Add catalog entries when a package needs them. Run `pnpm install` after dependency changes and use `--frozen-lockfile` in CI.
- Use `pnpm exec` for installed tools or `pnpm dlx <tool>@<exact-version>` for one-off tools.
- Manage agent skills with `pnpm exec skills` ([skills.sh](https://skills.sh)); keep `skills-lock.json` updated.

| Catalog    | Use                                                             |
| ---------- | --------------------------------------------------------------- |
| `runtime`  | Runtime dependencies and pinned development copies of peers     |
| `tooling`  | Build, compiler, lint and format tools in `devDependencies`     |
| `testing`  | Test-only tools in `devDependencies`                            |
| `examples` | Example-only dependencies; reuse `runtime` for shared libraries |
| `peers`    | Tested consumer compatibility ranges in `peerDependencies`      |

Declare dependencies in the package that imports them. Put build and test tools in `devDependencies`. Libraries use peers for dependencies supplied by consumers, with pinned development copies for checks. Mark a peer optional only if core imports work without it. Apps and examples install required peers themselves. Test compatibility before widening peer ranges.

## Workspace and checks

- Publish ESM only, with `type: module` and explicit package exports. Keep `types` first in conditional exports. Test packed packages outside the workspace before changing exports or build output.
- Put public packages in `packages/` and private workspaces in `apps/`, `examples/` or `tooling/`.
- Put disposable scripts, experiments and archives in ignored `scratchpad/`. Keep them out of the workspace. Use a package-local scratchpad when it needs that package's dependencies.
- Package scripts run tools; root scripts use Turbo for tasks across packages. Use `build`, `dev`, `lint`, `typecheck` and `test`; `test` must exit without watching.
- Declare generated files in Turbo `outputs`. Use `^build` for tasks that consume built dependencies. Keep `$TURBO_DEFAULT$` when adding inputs and include config files and environment variables that affect the task. Disable caching for tasks that publish, deploy or otherwise change external state.
- Run `pnpm build` and `pnpm check` for code/config changes. Use `pnpm format` to format.

## Comments and docs

- Explain constraints and decisions in comments; do not restate the code. Preserve useful issue links.
- Package READMEs cover usage, requirements and limitations. Omit promotional claims and monorepo workflow details.

## Effect tooling

- Check Effect APIs against installed types or source for the version in use.
- Extend `@kutur-kit/tsconfig/effect.json`; set output options and paths in each package. Use `@kutur-kit/oxc/effect` and `@kutur-kit/oxc/format`. Keep the base and format presets usable without Effect tooling.
- TypeScript 7 uses `@effect/tsgo`; the plugin key remains `@effect/language-service`. Root `prepare` patches TypeScript and Oxlint. Upgrade TypeScript, Oxlint, oxlint-tsgolint and @effect/tsgo as a compatible set.
- Vendored anti-slop rules are in `packages/oxc/src/vendor/anti-slop`; see its `UPSTREAM.md` before updating. Pin `@oxlint/plugins` to the same version as Oxlint.
- Use the workspace native TypeScript server. Keep compiler Effect diagnostics enabled; editor overrides may disable duplicates when Oxlint supplies them. See package READMEs for setup.
- If using the local Effect checkout at `~/.local/share/effect-solutions/effect`, check out the tag matching the dependency version. Builds must not depend on this checkout.
