import type { Demo } from "./demo.ts";

import { Array, Option, Record } from "effect";

/** A demo whose Model and Message the page does not know; it only routes them back to the demo. */
export type AnyDemo = Demo<unknown, unknown>;

/** One component's page. */
export type Page = Readonly<{
  /** The demo's file name without `.ts`, which is also the page's path. */
  slug: string;
  /** The @foldkit/ui component, such as `RadioGroup`. */
  component: string;
  demo: AnyDemo;
}>;

/** Pages under one heading of the sidebar, the Components popover and the index. */
export type Group = Readonly<{ heading: string; pages: ReadonlyArray<Page> }>;

// Vite's glob cannot check a module against a type, so test/pages.test.ts checks that each one
// exports what `Demo` names.
const demos = import.meta.glob<AnyDemo>("./demos/*.ts", { eager: true });

const slugOf = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".ts".length);

/** The @foldkit/ui component a page's slug names: `radio-group` names `RadioGroup`. */
export const componentOf = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const demosBySlug = Record.mapKeys(demos, slugOf);

// Each page's group, in the order the sidebar lists them. test/pages.test.ts checks that every demo
// sits in exactly one.
const layout: ReadonlyArray<readonly [heading: string, slugs: ReadonlyArray<string>]> = [
  [
    "Forms",
    [
      "button",
      "calendar",
      "checkbox",
      "date-picker",
      "fieldset",
      "file-drop",
      "input",
      "radio-group",
      "select",
      "slider",
      "switch",
      "textarea",
    ],
  ],
  ["Lists and menus", ["combobox", "drag-and-drop", "listbox", "menu", "virtual-list"]],
  ["Overlays", ["dialog", "hover-intent", "popover", "tooltip"]],
  ["Feedback", ["meter", "progress", "toast"]],
  ["Layout", ["animation", "disclosure", "nav", "tabs"]],
];

export const groups: ReadonlyArray<Group> = layout.map(([heading, slugs]) => ({
  heading,
  pages: slugs.flatMap((slug) =>
    Option.toArray(Record.get(demosBySlug, slug)).map((demo) => ({
      slug,
      component: componentOf(slug),
      demo,
    })),
  ),
}));

/** Every page, in the groups' order. */
export const pages: ReadonlyArray<Page> = groups.flatMap((group) => group.pages);

/** The page at `/<slug>`. */
export const pageOf = (slug: string): Option.Option<Page> =>
  Array.findFirst(pages, (page) => page.slug === slug);
