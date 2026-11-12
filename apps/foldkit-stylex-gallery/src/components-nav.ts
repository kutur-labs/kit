import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Menu } from "@kutur-kit/foldkit-stylex-theme/menu";
import { Nav } from "@kutur-kit/foldkit-stylex-theme/nav";
import { Popover } from "@kutur-kit/foldkit-stylex-theme/popover";
import {
  color,
  fontSize,
  fontWeight,
  lineHeight,
  space,
} from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { defineView } from "foldkit/submodel";

import { viewportPadding } from "./anchor.ts";
import { componentOf, groups, pages } from "./pages.ts";

// The pages as links, grouped: the sidebar, and for screens too narrow for it, the same links in a
// popover. Site navigation is links rather than a menu of actions: each opens like any link, and
// the current one carries aria-current, which no menu item may.

export const Model = Popover.Model;

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotPopoverMessage: { message: Popover.Message } });

export type Message = typeof Message.Type;

export const init = (): Model => Popover.init({ id: "components", isAnimated: true });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPopoverMessage: ({ message }) => {
      const next = Popover.update(model, message);

      return {
        model: next.model,
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotPopoverMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // A column of groups instead of the theme's row of links.
  nav: { flexDirection: "column", flexWrap: "nowrap", gap: space.lg },
  group: { display: "grid", gap: 1 },
  heading: {
    margin: 0,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    color: color.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.xs,
  },
  // As the theme's Menu trigger, which a chevron ends.
  button: { paddingInlineEnd: space.sm },
  // A list's padding, as the links' fill reaches their own edges.
  panel: { padding: space.xs },
});

const Groups = Nav.restyle({ nav: styles.nav });

const Pages = Popover.restyle({ button: styles.button, panel: styles.panel });

/** What the links need from the page: whether a page's slug names the one it shows. */
export type ViewInputs = Readonly<{ isItemCurrent: (slug: string) => boolean }>;

/** The pages' links under their groups' headings. */
export const links = <Message>({ isItemCurrent }: ViewInputs, h: HtmlBuilder<Message>): Html =>
  Groups.view({
    items: pages.map(({ slug }) => slug),
    ariaLabel: "Components",
    toHref: (slug) => `/${slug}`,
    isItemCurrent,
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        groups.map((group) =>
          h.div(
            [sx(styles.group)],
            [
              h.h2([sx(styles.heading)], [group.heading]),
              ...items
                .filter((item) => group.pages.some(({ slug }) => slug === item.value))
                .map((item) => h.a([...item.link], [componentOf(item.value)])),
            ],
          ),
        ),
      ),
  });

/** The links in a popover from a Components button. */
export const view = defineView<Model, Message, ViewInputs>((model, inputs, h) =>
  h.submodel({
    slotId: "popover",
    model,
    view: Pages.view,
    viewInputs: {
      anchor: { placement: "bottom-end", gap: 4, padding: viewportPadding },
      toView: ({ wrapper, button, panel, backdrop, isVisible }) =>
        h.div(
          [...wrapper],
          [
            h.button([...button], [Menu.buttonContent("Components", model)]),
            ...(isVisible ? [h.div([...backdrop]), h.div([...panel], [links(inputs, h)])] : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotPopoverMessage({ message }),
  }),
);
