import type { Html, HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import { DialogStyle, sx } from "@kutur-kit/foldkit-stylex";
import { dialogTheme } from "@kutur-kit/foldkit-stylex-theme/dialog";
import { color, radius, size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
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
  model: { dialog: Dialog.init({ id: "themed-confirm", isAnimated: true }) },
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

// A plain button of the app's own, drawn from the theme's tokens.
const styles = stylex.create({
  trigger: {
    minBlockSize: size.target,
    paddingInline: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.control,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    color: color.text,
    font: "inherit",
  },
});

const dialogView = DialogStyle.view(Dialog.view, dialogTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.button(
        [
          h.Id("themed-confirm-trigger"),
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
