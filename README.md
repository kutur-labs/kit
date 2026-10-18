# Kutur Kit

TypeScript libraries and tooling built around Effect.

## Development

Use the Node.js version in `.node-version` and pnpm version in `package.json`.

```sh
pnpm install
pnpm build
pnpm check
```

Use `pnpm format` and `pnpm lint:fix` to apply fixes.

Tests that need PostgreSQL or S3-compatible storage start containers through Testcontainers, so Docker must be running. The R2 tests of `@kutur-kit/assets` run against alchemy's local emulation; `TEST_R2_LIVE=1` with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` deploys them to Cloudflare instead. `pnpm bench` runs the benchmarks in `integration-tests`.

Installation patches TypeScript and Oxlint for Effect diagnostics. Run `pnpm prepare` if install scripts were skipped. Use the workspace TypeScript SDK in your editor.

## Packages

- [@kutur-kit/access](./packages/access/README.md): Permissions as Effect services, with caller restrictions, list filters and audit.
- [@kutur-kit/assets](./packages/assets/README.md): Typed file storage with signed uploads, for S3-compatible storage and R2.
- [@kutur-kit/audit](./packages/audit/README.md): Typed audit events with PostgreSQL storage.
- [@kutur-kit/tsconfig](./packages/tsconfig/README.md): TypeScript and Effect presets.
- [@kutur-kit/oxc](./packages/oxc/README.md): Oxlint rules and Oxfmt configuration.

See [AGENTS.md](./AGENTS.md) for repository conventions.
