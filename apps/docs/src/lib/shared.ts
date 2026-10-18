import { createGetUrl } from "fumadocs-core/source";

export const appName = "Kutur Kit";

export const siteUrl = "https://kit.kuturlabs.com";

export const docsRoute = "/docs";

export const gitConfig = {
  user: "kutur-labs",
  repo: "kit",
  branch: "main",
};

const getDocsUrl = createGetUrl(docsRoute);

/**
 * The repository file a page is edited in. Package pages and guides are
 * generated from package READMEs and from templates in `content/`.
 */
export function getPageSourcePath(path: string) {
  if (path.startsWith("packages/")) {
    return `packages/${path.slice("packages/".length).replace(/\.md$/, "")}/README.md`;
  }

  if (path.startsWith("guides/") || path === "index.mdx") return `apps/docs/content/${path}`;

  return `apps/docs/content/docs/${path}`;
}

export function getPageSourceUrl(path: string) {
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${getPageSourcePath(path)}`;
}

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string | undefined }) {
  const segments = [...page.slugs];

  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }

  return { segments, url: getDocsUrl(segments, page.locale) };
}

export function decodeMarkdownUrl(segments: string[]) {
  if (segments.length === 0) return [];

  const out = [...segments];
  out[out.length - 1] = (out[out.length - 1] ?? "").replace(/\.md$/, "");

  if (out.length === 1 && out[0] === "index") out.pop();

  return out;
}
