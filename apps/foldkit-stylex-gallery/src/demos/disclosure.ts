import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import { DisclosureStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isOpen: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledShipping: { isOpen: Schema.Boolean } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { isOpen: false } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledShipping: ({ isOpen }) => ({ model: { isOpen } }),
  });

const styles = stylex.create({
  root: { maxInlineSize: 400 },
  button: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    inlineSize: "100%",
    minBlockSize: 44,
    paddingInline: 12,
    borderWidth: 0,
    borderBlockEndWidth: 1,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  },
  open: { fontWeight: 700 },
  // The chevron is the app's own element, turned from the model.
  chevron: {
    transitionProperty: "rotate",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  turned: { rotate: "180deg" },
  // animatePanel clips the panel to its box, so it stays flat.
  panel: { paddingBlock: 8, paddingInline: 12 },
});

const disclosureView = DisclosureStyle.view(Disclosure.view, {
  button: (state) => [styles.button, state.isOpen && styles.open],
  panel: styles.panel,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  disclosureView(
    {
      id: "shipping",
      isOpen: model.isOpen,
      onToggle: (isOpen) => Message.ToggledShipping({ isOpen }),
      toView: ({ button, panel, animatePanel }) =>
        h.div(
          [sx(styles.root)],
          [
            h.button(
              [...button],
              [
                "Shipping",
                h.span(
                  [h.AriaHidden(true), sx(styles.chevron, model.isOpen && styles.turned)],
                  ["▾"],
                ),
              ],
            ),
            animatePanel(h.div([...panel], ["Orders leave the shop within two working days."])),
          ],
        ),
    },
    h,
  );
