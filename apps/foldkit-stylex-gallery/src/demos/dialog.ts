import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { Dialog } from "@kutur-kit/foldkit-stylex-theme/dialog";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

import { dangerView } from "./button.ts";

export const summary = "A modal panel that keeps the rest of the page inert until it closes.";

export const Model = Schema.Struct({ dialog: Dialog.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedOpen: {},
  ClickedKeep: {},
  ClickedDelete: {},
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
    // The demo has no draft to delete, so both answers close the dialog.
    ClickedKeep: () => lifted(Dialog.close(model.dialog)),
    ClickedDelete: () => lifted(Dialog.close(model.dialog)),
    GotDialogMessage: ({ message }) => lifted(Dialog.update(model.dialog, message)),
  });

const styles = stylex.create({
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: space.sm,
    marginBlockStart: space.md,
  },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      Button.view(
        {
          onClick: Message.ClickedOpen(),
          toView: ({ button }) => h.button([...button, h.Id("confirm-trigger")], ["Delete draft"]),
        },
        h,
      ),
      h.submodel({
        slotId: "confirm",
        model: model.dialog,
        view: Dialog.view,
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
                        h.p(
                          [...description],
                          ["“Spring notes” and its 12 comments are deleted for good."],
                        ),
                        h.div(
                          [sx(styles.actions)],
                          [
                            Button.view(
                              {
                                onClick: Message.ClickedKeep(),
                                toView: ({ button }) => h.button([...button], ["Keep it"]),
                              },
                              h,
                            ),
                            dangerView(
                              {
                                onClick: Message.ClickedDelete(),
                                toView: ({ button }) => h.button([...button], ["Delete"]),
                              },
                              h,
                            ),
                          ],
                        ),
                        h.button([...closeButton, h.AriaLabel("Close")], [Dialog.closeIcon()]),
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
