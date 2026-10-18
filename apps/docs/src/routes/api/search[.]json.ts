import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";

import { source } from "@/lib/source";

const server = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
});

// Prerendered as the index the browser searches; see `components/search.tsx`.
export const Route = createFileRoute("/api/search.json")({
  server: {
    handlers: {
      GET: async () => server.staticGET(),
    },
  },
});
