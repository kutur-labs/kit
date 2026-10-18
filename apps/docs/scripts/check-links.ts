import { existsSync, globSync, readFileSync } from "node:fs";

// The prerender crawler fails on links to missing pages but ignores
// fragments. This checks both in the built HTML.
const output = ".output/public";

const pages = new Map(
  globSync("**/*.html", { cwd: output }).map((file) => {
    const path = `/${file}`.replace(/(?:\/index)?\.html$/, "") || "/";
    const html = readFileSync(`${output}/${file}`, "utf8");

    return [path, html] as const;
  }),
);

const ids = (html: string) => new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), ([, id]) => id));

const failures: string[] = [];

for (const [page, html] of pages) {
  for (const [, href = ""] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (!href.startsWith("/") && !href.startsWith("#")) continue;

    const [path = "", fragment] = href.split("#");
    const target = path === "" ? page : path.replace(/\/$/, "") || "/";

    if (!pages.has(target) && !existsSync(`${output}${path}`)) {
      failures.push(`${page}: ${href} has no page`);
    } else if (
      fragment &&
      pages.has(target) &&
      !ids(pages.get(target) ?? "").has(decodeURIComponent(fragment))
    ) {
      failures.push(`${page}: ${href} has no matching id`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken links:\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Checked links in ${pages.size} pages.`);
