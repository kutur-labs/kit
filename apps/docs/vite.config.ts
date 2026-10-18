import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The crawler follows HTML links only. Text routes, the search index and the
// 404 page are listed here. Content is synced before the build reads it.
const markdownPages = globSync("**/*.{md,mdx}", { cwd: "content/docs" }).map((file) => ({
  path: `/docs/${file.replace(/\.mdx?$/, "")}.md`,
}));

const pages = [
  ...markdownPages,
  { path: "/llms.txt" },
  { path: "/llms-full.txt" },
  { path: "/sitemap.xml" },
  { path: "/api/search.json" },
  { path: "/404", prerender: { outputPath: "/404.html" } },
];

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      router: { generatedRouteTree: "./route-tree.gen.ts" },
      prerender: { enabled: true, crawlLinks: true },
      pages,
    }),
    react(),
    nitro({ preset: "node-server" }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
