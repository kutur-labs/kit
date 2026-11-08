import type { Html, HtmlBuilder } from "foldkit/html";

import { Toast as UiToast } from "@foldkit/ui";
import { ToastStyle, sx } from "@kutur-kit/foldkit-stylex";
import { toastContent, toastTheme } from "@kutur-kit/foldkit-stylex-theme/toast";
import { color, radius, size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Toast = UiToast.make(Schema.Struct({ text: Schema.String }));

export const Model = Schema.Struct({ toast: Toast.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedSave: {},
  ClickedFail: {},
  GotToastMessage: { message: Toast.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { toast: Toast.init({ id: "themed-notifications" }) },
});

const lifted = (
  next: Readonly<{ model: Model["toast"]; commands?: Update.Commands<typeof Toast.Message.Type> }>,
) => ({
  model: { toast: next.model },
  commands: Command.mapMessages(next.commands, (message) => Message.GotToastMessage({ message })),
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => lifted(Toast.show(model.toast, { payload: { text: "Draft saved." } })),
    ClickedFail: () =>
      lifted(
        Toast.show(model.toast, {
          payload: { text: "The draft could not be saved." },
          variant: "Error",
          sticky: true,
        }),
      ),
    GotToastMessage: ({ message }) => lifted(Toast.update(model.toast, message)),
  });

export const subscriptions = Subscription.lift(Toast.subscriptions)<Model, Message>({
  read: (model) => Option.some(model.toast),
  toParentMessage: (message) => Message.GotToastMessage({ message }),
});

// Plain buttons of the app's own, drawn from the theme's tokens.
const styles = stylex.create({
  actions: { display: "flex", gap: space.sm },
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

const toastView = ToastStyle.view(Toast.view, toastTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.actions)],
    [
      h.button([h.Type("button"), h.OnClick(Message.ClickedSave()), sx(styles.trigger)], ["Save"]),
      h.button(
        [h.Type("button"), h.OnClick(Message.ClickedFail()), sx(styles.trigger)],
        ["Fail to save"],
      ),
      h.submodel({
        slotId: "notifications",
        model: model.toast,
        view: toastView,
        viewInputs: {
          position: "BottomRight",
          entryToView: (entry, { dismiss }) =>
            h.div(
              [sx(toastContent.body, entry.variant === "Error" && toastContent.error)],
              [h.p([], [entry.payload.text]), h.button([...dismiss], ["Dismiss"])],
            ),
        },
        toParentMessage: (message) => Message.GotToastMessage({ message }),
      }),
    ],
  );
