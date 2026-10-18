import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { defineDocs } from "fumadocs-mdx/macro";

import { docsRoute } from "./shared";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

/** Rewrites `<Cards>` blocks as Markdown link lists for the text routes. */
export function cardsToMarkdown(markdown: string) {
  return markdown
    .replace(
      /^[ \t]*<Card title="([^"]+)" href="([^"]+)">\s*([\s\S]*?)\s*<\/Card>/gm,
      (_, title: string, href: string, description: string) =>
        `- [${title}](${href}): ${description.replace(/\s+/g, " ")}`,
    )
    .replace(/^[ \t]*<\/?Cards>[ \t]*\n/gm, "");
}

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${cardsToMarkdown(await page.data.getText("processed"))}`,
});
