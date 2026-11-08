import type { Html, HtmlBuilder } from "foldkit/html";

import { Toast as UiToast } from "@foldkit/ui";
import { ToastStyle, sx } from "@kutur-kit/foldkit-stylex";
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
  model: { toast: Toast.init({ id: "notifications" }) },
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

// Hover and swipe gestures on entries are tracked on the document.
export const subscriptions = Subscription.lift(Toast.subscriptions)<Model, Message>({
  read: (model) => Option.some(model.toast),
  toParentMessage: (message) => Message.GotToastMessage({ message }),
});

const styles = stylex.create({
  actions: { display: "flex", gap: 8 },
  trigger: { minBlockSize: 44, font: "inherit" },
  // Every entry shares one class, so it animates on @foldkit/ui's data-closed. Swipe moves it
  // with translate, so the animation uses opacity and scale.
  entry: {
    minInlineSize: 280,
    transitionProperty: "opacity, scale",
    transitionDuration: { default: "200ms", "@media (prefers-reduced-motion: reduce)": "0s" },
    opacity: { default: 1, ":is([data-closed])": 0 },
    scale: { default: 1, ":is([data-closed])": 0.95 },
  },
  body: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
  },
  error: { backgroundColor: "mistyrose" },
  dismiss: { minBlockSize: 44, font: "inherit" },
});

const toastView = ToastStyle.view(Toast.view, { entry: styles.entry, dismiss: styles.dismiss });

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
              [sx(styles.body, entry.variant === "Error" && styles.error)],
              [h.p([], [entry.payload.text]), h.button([...dismiss], ["Dismiss"])],
            ),
        },
        toParentMessage: (message) => Message.GotToastMessage({ message }),
      }),
    ],
  );
