# Kutur Kit

Open-source [Effect](https://effect.website) libraries and tools from Kutur Labs.

## Development

Use the Node.js version in `.node-version` and pnpm version in `package.json`.

```sh
pnpm install
pnpm build
pnpm check
```

Use `pnpm format` and `pnpm lint:fix` to apply fixes.

Tests that need PostgreSQL or S3-compatible storage start containers through Testcontainers, so Docker must be running. The R2 tests of `@kutur-kit/assets` run against alchemy's local emulation; `TEST_R2_LIVE=1` with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` deploys them to Cloudflare instead. `pnpm bench` runs the benchmarks in `integration-tests`.

Type checks and type-aware lint run on [tsrs](https://github.com/oxc-project/tsrs), with Effect diagnostics through `effect-tsgo`. Editors start the same through `scripts/editor`:

- VS Code: the TypeScript 7 (`TypeScriptTeam.native-preview`) and Oxc (`oxc.oxc-vscode`) extensions.
- Zed: the Oxc extension and [Effect tsrs](https://github.com/NoksLabs/effect-tsrs-lsp), installed as a dev extension, which finds the same tsrs.

## Packages

- [@kutur-kit/access](./packages/access/README.md): Permissions as Effect services, with caller restrictions, list filters and audit.
- [@kutur-kit/assets](./packages/assets/README.md): Typed file storage with signed uploads, for S3-compatible storage and R2.
- [@kutur-kit/audit](./packages/audit/README.md): Typed audit events with PostgreSQL storage.
- [@kutur-kit/tsconfig](./packages/tsconfig/README.md): TypeScript and Effect presets.
- [@kutur-kit/oxc](./packages/oxc/README.md): Oxlint rules and Oxfmt configuration.
- [@kutur-kit/strict](./packages/strict/README.md): A pnpm hook that requires exact catalog versions.

See [AGENTS.md](./AGENTS.md) for repository conventions.
