import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Nav } from "@kutur-kit/foldkit-stylex-theme/nav";
import { Schema } from "effect";

export const summary = "Links to the pages of a site, marking the current one.";

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

export const view = (_model: Model, h: HtmlBuilder<Message>): Html =>
  Nav.view({
    items,
    ariaLabel: "Related pages",
    toHref: (slug) => `/${slug}`,
    isItemCurrent: (slug) => slug === "nav",
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        items.map((item) => h.a([...item.link], [labels[item.value]])),
      ),
  });
