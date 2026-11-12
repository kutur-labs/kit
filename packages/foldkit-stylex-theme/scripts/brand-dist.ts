// Brands the compiled views with Foldkit's view identity, as @foldkit/ui brands its own dist, so an
// app's build need not transform node_modules. dist/testing.js stays as tsrs wrote it: Playwright
// sends tokenContrast to a page as source, where the brand's import would be undefined.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { brandDistDirectory } from "@foldkit/vite-plugin";

const testing = new URL("../dist/testing.js", import.meta.url);

const compiled = readFileSync(testing, "utf8");

brandDistDirectory(
  fileURLToPath(new URL("..", import.meta.url)),
  "@kutur-kit/foldkit-stylex-theme",
);

writeFileSync(testing, compiled);
