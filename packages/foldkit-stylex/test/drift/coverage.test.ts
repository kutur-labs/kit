import { readFileSync } from "node:fs";
import path from "node:path";

// Every @foldkit/ui component that renders has a namespace. @foldkit/ui exports no ./package.json,
// so the list comes from its entry.
import * as Ui from "@foldkit/ui";
import { describe, expect, it } from "vitest";

import * as Kit from "../../src/index.ts";

// Components without a namespace yet. Remove a name in the change that adds its namespace.
const pending = [
  "Animation",
  "Button",
  "Calendar",
  "Combobox",
  "DatePicker",
  "Disclosure",
  "DragAndDrop",
  "Fieldset",
  "FileDrop",
  "HoverIntent",
  "Input",
  "Menu",
  "Meter",
  "Nav",
  "Progress",
  "RadioGroup",
  "Select",
  "Switch",
  "Textarea",
  "Tooltip",
  "VirtualList",
];

const missing = (name: string) =>
  `@foldkit/ui exports ${name}; add ${name}Style with Styles and State, contract, drift and type tests, a README row and a gallery demo.`;

describe("coverage", () => {
  it("has a namespace for each @foldkit/ui component but Anchor, which renders nothing", () => {
    const uncovered = Object.keys(Ui).filter(
      (name) => name !== "Anchor" && !(`${name}Style` in Kit),
    );

    expect(uncovered.map(missing)).toEqual(pending.map(missing));
  });

  it("lists each namespace in the README's components table", () => {
    const readme = readFileSync(path.join(import.meta.dirname, "../../README.md"), "utf8");

    const section = readme.split(/^## /m).find((part) => part.startsWith("Components")) ?? "";

    // The first cell of each table row but the header.
    const rows = [...section.matchAll(/^\| (\w+) +\|/gm)].flatMap(([, name]) =>
      name === undefined || name === "Component" ? [] : [name],
    );

    const namespaces = Object.keys(Kit).flatMap((name) =>
      name.endsWith("Style") ? [name.slice(0, -"Style".length)] : [],
    );

    expect(rows).toEqual(namespaces);
  });
});
