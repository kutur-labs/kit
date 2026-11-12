import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { Toast } from "@kutur-kit/foldkit-stylex-theme/toast";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Brief notices stacked in a corner of the screen.";

const Notices = Toast.make(Schema.Struct({ text: Schema.String }));

export const Model = Schema.Struct({ toast: Notices.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSave: {},
  ClickedFail: {},
  GotToastMessage: { message: Notices.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { toast: Notices.init({ id: "notifications" }) },
});

const lifted = (
  next: Readonly<{
    model: Model["toast"];
    commands?: Update.Commands<typeof Notices.Message.Type>;
  }>,
) => ({
  model: { toast: next.model },
  commands: Command.mapMessages(next.commands, (message) => Message.GotToastMessage({ message })),
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => lifted(Notices.show(model.toast, { payload: { text: "Draft saved." } })),
    ClickedFail: () =>
      lifted(
        Notices.show(model.toast, {
          payload: { text: "The draft could not be saved." },
          variant: "Error",
          sticky: true,
        }),
      ),
    GotToastMessage: ({ message }) => lifted(Notices.update(model.toast, message)),
  });

export const subscriptions = Subscription.lift(Notices.subscriptions)<Model, Message>({
  read: (model) => Option.some(model.toast),
  toParentMessage: (message) => Message.GotToastMessage({ message }),
});

const styles = stylex.create({
  actions: { display: "flex", gap: space.sm },
  text: { margin: 0 },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.actions)],
    [
      Button.view(
        {
          onClick: Message.ClickedSave(),
          toView: ({ button }) => h.button([...button], ["Save"]),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.ClickedFail(),
          toView: ({ button }) => h.button([...button], ["Fail to save"]),
        },
        h,
      ),
      h.submodel({
        slotId: "notifications",
        model: model.toast,
        view: Notices.view,
        viewInputs: {
          position: "BottomRight",
          entryToView: (entry, { dismiss }) =>
            h.div(
              [sx(Toast.content.body, entry.variant === "Error" && Toast.content.error)],
              [
                h.p([sx(styles.text)], [entry.payload.text]),
                h.button([...dismiss, h.AriaLabel("Dismiss")], [Toast.closeIcon()]),
              ],
            ),
        },
        toParentMessage: (message) => Message.GotToastMessage({ message }),
      }),
    ],
  );
