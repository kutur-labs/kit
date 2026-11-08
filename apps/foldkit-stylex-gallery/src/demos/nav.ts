import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Nav } from "@foldkit/ui";
import { NavStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";

// Nav keeps no state: the URL says which page is current.
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
  nav: { display: "flex", gap: 8 },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: 44,
    paddingInline: 8,
    color: "inherit",
  },
  current: { fontWeight: 700, textDecorationLine: "none" },
});

const navView = NavStyle.view(Nav.view, {
  nav: styles.nav,
  link: (state) => [styles.link, state.isCurrent && styles.current],
});

// This demo renders at /nav, so that page is the current one.
export const view = (_model: Model, h: HtmlBuilder<Message>): Html =>
  navView({
    items,
    ariaLabel: "Components",
    toHref: (slug) => `/${slug}`,
    isItemCurrent: (slug) => slug === "nav",
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        items.map((item) => h.a([...item.link], [labels[item.value]])),
      ),
  });
