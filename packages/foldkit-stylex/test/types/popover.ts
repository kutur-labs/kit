import type { Html, HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";

export const details = (model: Popover.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: popoverView,
    viewInputs: {
      anchor: { placement: "bottom", gap: 12 },
      toView: ({ wrapper, button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [...wrapper],
          [
            h.button([...button], ["Details"]),
            ...(isVisible
              ? [
                  h.div([...backdrop]),
                  h.div([...panel], [h.div([...arrow]), h.p([], ["Shipping takes two days."])]),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotInfoMessage({ message }),
  });

const styles = stylex.create({
  trigger: { minBlockSize: 44, paddingInline: 16 },
  triggerOpen: { fontWeight: 700 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    inlineSize: 256,
    padding: 16,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.15)",
    transitionProperty: "opacity, scale",
    transitionDuration: "150ms",
  },
  panelClosed: { opacity: 0, scale: 0.95 },
  dim: { backgroundColor: "rgb(0 0 0 / 0.1)" },
  arrow: {
    inlineSize: 16,
    blockSize: 16,
    backgroundColor: "white",
    clipPath: "polygon(50% 0, 100% 50%, 0 50%)",
  },
});

const popoverView = PopoverStyle.view(Popover.view, {
  button: (state) => [styles.trigger, state.isVisible && styles.triggerOpen],
  panel: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  backdrop: styles.dim,
  arrow: styles.arrow,
});
