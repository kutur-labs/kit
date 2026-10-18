import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { docsRoute, getPageMarkdownUrl } from "./src/lib/shared";

interface Env {
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
}

// Runs before the static assets for `/docs` paths only (see `alchemy.run.ts`).
// It keeps the content negotiation of `src/start.ts`: a request that prefers
// Markdown is redirected to the page's `.md` file.
export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (!url.pathname.endsWith(".md") && isMarkdownPreferred(request)) {
      const slugs = url.pathname
        .slice(docsRoute.length)
        .split("/")
        .filter((segment) => segment.length > 0);

      url.pathname = getPageMarkdownUrl({ slugs }).url;

      return new Response(null, {
        status: 302,
        headers: { Location: url.href, Vary: "Accept" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
