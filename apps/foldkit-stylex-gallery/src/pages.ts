import type { Demo } from "./demo.ts";

import { Array, Order, Record, type Option } from "effect";

/** A demo whose Model and Message the page does not know; it only routes them back to the demo. */
export type AnyDemo = Demo<unknown, unknown>;

/** One component's page. */
export type Page = Readonly<{
  /** The demo's file name without `.ts`, which is also the page's path. */
  slug: string;
  /** The @foldkit/ui component, such as `RadioGroup`. */
  component: string;
  core: AnyDemo;
  themed: Option.Option<AnyDemo>;
}>;

// Vite's glob cannot check a module against a type. test/pages.test.ts renders every page on the
// server, so a demo without the exports `Demo` names fails there.
const coreDemos = import.meta.glob<AnyDemo>("./demos/*.ts", { eager: true });

const themedDemos = import.meta.glob<AnyDemo>("./themed/*.ts", { eager: true });

const slugOf = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".ts".length);

const componentOf = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const bySlug = (demos: Record<string, AnyDemo>) => Record.mapKeys(demos, (path) => slugOf(path));

const themedBySlug = bySlug(themedDemos);

/** Every component with a core demo, in alphabetical order. */
export const pages: ReadonlyArray<Page> = Array.sort(
  Object.entries(bySlug(coreDemos)).map(([slug, core]): Page => ({
    slug,
    component: componentOf(slug),
    core,
    themed: Record.get(themedBySlug, slug),
  })),
  Order.mapInput(Order.String, (page: Page) => page.slug),
);

/** The page at `/<slug>`. */
export const pageOf = (slug: string): Option.Option<Page> =>
  Array.findFirst(pages, (page) => page.slug === slug);
