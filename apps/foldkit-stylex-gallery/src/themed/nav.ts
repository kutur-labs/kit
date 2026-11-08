import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Nav } from "@foldkit/ui";
import { NavStyle } from "@kutur-kit/foldkit-stylex";
import { navTheme } from "@kutur-kit/foldkit-stylex-theme/nav";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";

export const Model = Schema.Struct({});

export type Model = typeof Model.Type;

export const Message = Schema.Never;

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: {} });

export const update = (model: Model): Update.Return<Model, Message> => ({ model });

type Slug = "hover-intent" | "nav" | "tooltip";

const items: ReadonlyArray<Slug> = ["hover-intent", "nav", "tooltip"];

const labels = {
  "hover-intent": "HoverIntent",
  nav: "Nav",
  tooltip: "Tooltip",
} satisfies Record<Slug, string>;

const styles = stylex.create({
  // The app's layer over the look: a sidebar instead of a row.
  sidebar: { flexDirection: "column", alignItems: "flex-start" },
});

const navView = NavStyle.view(Nav.view, navTheme, { nav: styles.sidebar });

export const view = (_model: Model, h: HtmlBuilder<Message>): Html =>
  navView({
    items,
    ariaLabel: "Themed components",
    toHref: (slug) => `/${slug}`,
    isItemCurrent: (slug) => slug === "nav",
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        items.map((item) => h.a([...item.link], [labels[item.value]])),
      ),
  });
