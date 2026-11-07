// Each namespace styles every part @foldkit/ui renders. A part @foldkit/ui adds fails a test in this
// directory; a part it renames or removes already fails the type check through `Supported`.
import type { HtmlBuilder } from "foldkit/html";

import { readFileSync } from "node:fs";

import * as Scene from "foldkit/scene";

/** The keys of the attribute bundles in `render`, sorted and joined, for a `data-keys` attribute. */
export const bundleKeys = <Render extends object>(render: Render) =>
  Object.entries(render)
    .filter(([, value]) => Array.isArray(value))
    .map(([key]) => key)
    .sort()
    .join(" ");

/** An element whose `data-keys` lists the attribute bundles in `render`. */
export const keysOf = <Render extends object, Message>(render: Render, h: HtmlBuilder<Message>) =>
  h.div([h.DataAttribute("keys", bundleKeys(render))], []);

/** `keys` as `bundleKeys` lists them. */
export const expected = (...keys: ReadonlyArray<string>) => [...keys].sort().join(" ");

export const keys = Scene.selector("[data-keys]");

/**
 * The class name inputs a @foldkit/ui declaration file declares. View inputs are types only, and
 * @foldkit/ui's views copy them before reading, so the installed declarations are the record.
 */
export const declaredClassNames = (file: string) =>
  [
    ...new Set(
      readFileSync(new URL(file, import.meta.resolve("@foldkit/ui")), "utf8").match(
        /\b\w*(?:ClassName|className)(?=\?:)/g,
      ),
    ),
  ].sort();
