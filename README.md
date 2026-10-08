# Kutur Kit

Composable, Effect-native building blocks for modern applications.

The repository currently contains the pnpm/Turborepo workspace bootstrap. Library implementations are planned in [DRAFT_SPEC.md](./DRAFT_SPEC.md).

## Development

Use Node.js 24.21.0 (pinned in `.node-version`) and the exact pnpm version in `package.json`. With fnm, run `fnm install` and `fnm use` from the repository root first.

```sh
pnpm install
pnpm build
pnpm check
```

`pnpm dev` starts package development tasks. `pnpm lint`, `pnpm typecheck` and `pnpm test` run individual checks. These commands run package scripts as packages are added; the initial workspace has no package tasks yet.

Libraries live in `packages/`, applications in `apps/`, runnable examples in `examples/` and repository tooling in `tooling/`.

See [AGENTS.md](./AGENTS.md) for dependency placement, exact version pins and named catalog conventions. CI and reproducible installs should use `pnpm install --frozen-lockfile`.
