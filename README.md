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

Tests that need PostgreSQL start a container through Testcontainers, so Docker must be running. `pnpm bench` runs the benchmarks in `integration-tests`.

Installation patches TypeScript and Oxlint for Effect diagnostics. Run `pnpm prepare` if install scripts were skipped. Use the workspace TypeScript SDK in your editor.

## Packages

- [@kutur-kit/access](./packages/access/README.md): Permissions as Effect services, with caller restrictions, list filters and audit.
- [@kutur-kit/audit](./packages/audit/README.md): Typed audit events with PostgreSQL storage.
- [@kutur-kit/tsconfig](./packages/tsconfig/README.md): TypeScript and Effect presets.
- [@kutur-kit/oxc](./packages/oxc/README.md): Oxlint rules and Oxfmt configuration.

See [AGENTS.md](./AGENTS.md) for repository conventions.
