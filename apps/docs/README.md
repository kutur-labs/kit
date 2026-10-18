# Kit documentation

Fumadocs with TanStack Start for `https://kit.kuturlabs.com`.

```sh
pnpm --filter @kutur-kit/docs dev
pnpm --filter @kutur-kit/docs build
pnpm --filter @kutur-kit/docs deploy
```

The build prerenders every route to `.output/public`: pages, `.md` and `llms` text routes, the sitemap, the search index (`/api/search.json`) and loader data for client navigation. It then fails on links to missing pages or headings. New text routes must be added to `pages` in `vite.config.ts`, since the crawler follows HTML links only.

## Deployment

`deploy` runs `alchemy.run.ts` with the `prod` stage. It builds the site and serves `.output/public` from a Cloudflare Worker with static assets on the custom domain `kit.kuturlabs.com`, which Cloudflare provisions with its DNS record and certificate. The `kuturlabs.com` zone must be in the deploying account. Stack state is kept in the account's alchemy state store, so any machine with access to the account can deploy.

`worker.ts` runs before the assets for `/docs` paths only. It redirects requests that prefer Markdown to the page's `.md` file, as `src/start.ts` does in development.

## Content

Edit `content/index.mdx` for Getting started and `content/docs` for other introductory pages. Package pages are generated from `packages/*/README.md`, with titles and descriptions from each `package.json`; the Getting started cards and the home page list use the same descriptions. To add a package, add it to `scripts/sync-package-docs.ts`. Restart the dev server after changing a README, manifest or template. Generated pages are ignored by Git.

Run the build before standalone type checks to generate the route tree and MDX types. The workspace check task handles this dependency.

## Guides and playgrounds

Edit guide templates in `content/guides` and executable programs in `src/demos`. The content sync script embeds those programs into the generated guides, so the displayed code is the code the playground runs. Templates use `<!-- demo:permission -->` and `<!-- demo:storage -->` as insertion points. Restart the dev server after editing a template or demo source to refresh the displayed snippets.

`pnpm --filter @kutur-kit/docs test` runs the demo behavior checks. The browser programs use workspace packages directly, with memory storage and a test audit log. They make no storage requests and start with fresh state on each run.
