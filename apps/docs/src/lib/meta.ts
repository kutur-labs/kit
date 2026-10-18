import { appName, siteUrl } from "./shared";

/** Description, canonical URL and link preview tags for a page. */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const url = `${siteUrl}${path}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: appName },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
