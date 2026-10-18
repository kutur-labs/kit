# Kutur Kit

## Dependencies

- Use pnpm at the version in `packageManager`. Use `.node-version` for development and CI; keep `engines.node` in sync. Published packages declare their tested Node versions separately.
- Keep external versions in `pnpm-workspace.yaml`; manifests use `catalog:<name>`. Use exact versions except for published peer dependency ranges.
- Use `workspace:*` for local dependencies and `workspace:^` for local peers.
- Add catalog entries when a package needs them. Run `pnpm install` after dependency changes and use `--frozen-lockfile` in CI.
- Use `pnpm exec` for installed tools or `pnpm dlx <tool>@<exact-version>` for one-off tools.
- Manage agent skills with `pnpm exec skills` ([skills.sh](https://skills.sh)); keep `skills-lock.json` updated.

| Catalog   | Use                                                         |
| --------- | ----------------------------------------------------------- |
| `runtime` | Runtime dependencies and pinned development copies of peers |
| `tooling` | Build, compiler, lint and format tools in `devDependencies` |
| `testing` | Test-only tools in `devDependencies`                        |
| `peers`   | Tested consumer compatibility ranges in `peerDependencies`  |

Declare dependencies in the package that imports them. Put build and test tools in `devDependencies`. Libraries use peers for dependencies supplied by consumers, with pinned development copies for checks. Mark a peer optional only if core imports work without it. Apps install required peers themselves. Test compatibility before widening peer ranges.

## Workspace and checks

- Publish ESM only, with `type: module` and explicit package exports. Keep `types` first in conditional exports. Test packed packages outside the workspace before changing exports or build output.
- Put public packages in `packages/` and private workspaces in `apps/` or `tooling/`.
- Put disposable scripts, experiments and archives in ignored `scratchpad/`. Keep them out of the workspace. Use a package-local scratchpad when it needs that package's dependencies.
- Package scripts run tools; root scripts use Turbo for tasks across packages. Use `build`, `dev`, `lint`, `typecheck` and `test`; `test` must exit without watching.
- Declare generated files in Turbo `outputs`. Use `^build` for tasks that consume built dependencies. Keep `$TURBO_DEFAULT$` when adding inputs and include config files and environment variables that affect the task. Disable caching for tasks that publish, deploy or otherwise change external state.
- Run `pnpm build` and `pnpm check` for code/config changes. Use `pnpm format` to format. CI runs both with the Node, pnpm and PostgreSQL versions pinned here; pin GitHub Actions and container images by digest, with the version in a comment or tag. Workflows set up Node, pnpm and dependencies with the shared `.github/actions/setup` action.
- Tests that need PostgreSQL use `@kutur-kit/testcontainers`: one reused container shared by all runs (Docker must be running), with a fresh database per test. Set `TEST_POSTGRES_URL` to use another server, or `TESTCONTAINERS_REUSE_ENABLE=false` for a container per run.
- For test work, read and follow [test-quality](.agents/skills/test-quality/SKILL.md), including files in `test/`, `tests/`, `__tests__/` or `typetest/` and files named `*.test.*`, `*.spec.*` or `*.tst.*`.

## Releases

- Versions and changelogs come from [Changesets](https://changesets.dev). Add a changeset with `pnpm changeset` in the change's pull request, for each public package it affects.
- Packages are in alpha: `0.1.0-alpha.N`, published under the `alpha` npm tag (`.changeset/pre.json`). Move to beta with `pnpm changeset pre exit` and `pnpm changeset pre enter beta`; exit pre mode for a normal release.
- `@kutur-kit/access` and `@kutur-kit/audit` always release together with the same version. `@kutur-kit/oxc` and `@kutur-kit/tsconfig` are versioned on their own. Private workspaces are never versioned.
- To release, run `pnpm release:version`, review and commit the versions and changelogs, then run `pnpm release`. It builds, checks and publishes with pnpm. A package's first publish also becomes its `latest` tag.

## File names

- Use PascalCase for public Effect modules, such as `ApprovalRequest.ts`, and match their exported module names.
- Use kebab-case for other files and directories, such as `approval-store.ts` and `drizzle-sqlite/`. Keep suffixes lowercase: `ApprovalRequest.test.ts`.
- Preserve tool-required names, standard files such as `README.md` and vendored filenames.

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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
