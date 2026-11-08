import type { Html, HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import { DialogStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ dialog: Dialog.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedOpen: {},
  GotDialogMessage: { message: Dialog.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { dialog: Dialog.init({ id: "confirm", isAnimated: true }) },
});

const lifted = (
  next: Readonly<{ model: Dialog.Model; commands?: Update.Commands<Dialog.Message> }>,
) => ({
  model: { dialog: next.model },
  commands: Command.mapMessages(next.commands, (message) => Message.GotDialogMessage({ message })),
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedOpen: () => lifted(Dialog.open(model.dialog)),
    GotDialogMessage: ({ message }) => lifted(Dialog.update(model.dialog, message)),
  });

const styles = stylex.create({
  trigger: { minBlockSize: 44, font: "inherit" },
  // A bottom sheet on narrow screens, centred from 40rem. The package hides it while closed.
  dialog: {
    display: "grid",
    placeItems: { default: "end center", "@media (min-width: 40rem)": "center" },
  },
  backdrop: {
    backgroundColor: "rgb(0 0 0 / 0.4)",
    transitionProperty: "opacity",
    transitionDuration: { default: "200ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  backdropClosed: { opacity: 0 },
  panel: {
    inlineSize: "min(28rem, 100%)",
    padding: 24,
    backgroundColor: "white",
    color: "black",
    transitionProperty: "opacity, translate",
    transitionDuration: { default: "200ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  panelClosed: { opacity: 0, translate: "0 2rem" },
  title: { marginBlock: 0, fontSize: "1.25rem" },
  close: { minBlockSize: 44, font: "inherit" },
});

const dialogView = DialogStyle.view(Dialog.view, {
  dialog: styles.dialog,
  backdrop: (state) => [styles.backdrop, state.isClosed && styles.backdropClosed],
  panel: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  title: styles.title,
  closeButton: styles.close,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.button(
        [
          h.Id("confirm-trigger"),
          h.Type("button"),
          h.OnClick(Message.ClickedOpen()),
          sx(styles.trigger),
        ],
        ["Delete draft"],
      ),
      h.submodel({
        slotId: "confirm",
        model: model.dialog,
        view: dialogView,
        viewInputs: {
          hasDescription: true,
          toView: ({ dialog, backdrop, panel, title, description, closeButton, isVisible }) =>
            h.dialog(
              [...dialog],
              isVisible
                ? [
                    h.div([...backdrop]),
                    h.div(
                      [...panel],
                      [
                        h.h2([...title], ["Delete this draft?"]),
                        h.p([...description], ["The draft and its notes go for good."]),
                        h.button([...closeButton], ["Keep it"]),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: (message) => Message.GotDialogMessage({ message }),
      }),
    ],
  );
