import { createFileRoute } from "@tanstack/react-router";

import { decodeMarkdownUrl } from "@/lib/shared";
import { docsLlms, source } from "@/lib/source";

export const Route = createFileRoute("/docs/{$}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = decodeMarkdownUrl(params._splat?.split("/") ?? []);
        const page = source.getPage(slugs);

        // notFound() is not converted to a 404 in server handlers; it surfaces as a 500.
        if (!page) return new Response("Not found", { status: 404 });

        return new Response(await docsLlms.page(page), {
          headers: {
            "Content-Type": "text/markdown",
          },
        });
      },
    },
  },
});
