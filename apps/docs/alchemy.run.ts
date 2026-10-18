import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

// Every page is prerendered, so the site deploys as static assets. Search uses
// a prerendered index and client navigation uses prerendered loader data.
export default Alchemy.Stack(
  "KitDocs",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const site = yield* Cloudflare.Website.StaticSite("Docs", {
      command: "pnpm turbo run build --filter=@kutur-kit/docs",
      outdir: ".output/public",
      main: "./worker.ts",
      domain: "kit.kuturlabs.com",
      // The site renders package READMEs and imports workspace sources.
      memo: {
        include: [
          "**/*",
          "../../packages/*/README.md",
          "../../packages/*/package.json",
          "../../packages/*/src/**",
        ],
        lockfile: true,
      },
      assets: {
        // Pages are `<path>/index.html`; serve them at `<path>`, the canonical URL.
        htmlHandling: "drop-trailing-slash",
        notFoundHandling: "404-page",
        runWorkerFirst: ["/docs", "/docs/*"],
        headers: "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n",
      },
    });

    return { url: site.url };
  }),
);
