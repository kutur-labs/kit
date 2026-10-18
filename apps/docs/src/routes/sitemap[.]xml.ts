import { createFileRoute } from "@tanstack/react-router";

import { siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = ["/", ...source.getPages().map((page) => page.url)]
          .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
          .join("\n");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          { headers: { "Content-Type": "application/xml" } },
        );
      },
    },
  },
});
