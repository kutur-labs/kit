import { createFileRoute } from "@tanstack/react-router";

import { NotFound } from "@/components/not-found";

// Prerendered to `404.html`, which the static host serves for unknown paths.
export const Route = createFileRoute("/404")({
  component: NotFound,
  head: () => ({
    meta: [{ title: "Not found | Kutur Kit" }, { name: "robots", content: "noindex" }],
  }),
});
