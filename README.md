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

Installation patches TypeScript and Oxlint for Effect diagnostics. Run `pnpm prepare` if install scripts were skipped. Use the workspace TypeScript SDK in your editor.

## Packages

- [@kutur-kit/tsconfig](./packages/tsconfig/README.md): TypeScript and Effect presets.
- [@kutur-kit/oxc](./packages/oxc/README.md): Oxlint rules and Oxfmt configuration.

See [AGENTS.md](./AGENTS.md) for repository conventions.
