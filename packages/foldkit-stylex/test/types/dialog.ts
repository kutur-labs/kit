import type { Html, HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import { DialogStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";

export const confirm = (model: Dialog.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: dialogView,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, title, closeButton, isVisible }) =>
        h.dialog(
          [...dialog],
          isVisible
            ? [
                h.div([...backdrop]),
                h.div(
                  [...panel],
                  [h.h2([...title], ["Delete the draft?"]), h.button([...closeButton], ["Cancel"])],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: (message) => Message.GotConfirmMessage({ message }),
  });

const styles = stylex.create({
  dialog: {
    display: "grid",
    placeItems: { default: "end center", "@media (min-width: 40rem)": "center" },
  },
  backdrop: {
    backgroundColor: "rgb(0 0 0 / 0.4)",
    transitionProperty: "opacity",
    transitionDuration: "200ms",
  },
  backdropClosed: { opacity: 0 },
  panel: {
    inlineSize: "min(28rem, 100%)",
    padding: 24,
    backgroundColor: "white",
    color: "black",
    transitionProperty: "translate",
    transitionDuration: "200ms",
  },
  panelClosed: { translate: "0 2rem" },
  title: { fontSize: "1.25rem", marginBlockEnd: 16 },
  close: { minBlockSize: 44 },
});

const dialogView = DialogStyle.view(Dialog.view, {
  dialog: styles.dialog,
  backdrop: (state) => [styles.backdrop, state.isClosed && styles.backdropClosed],
  panel: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  title: styles.title,
  closeButton: styles.close,
});
