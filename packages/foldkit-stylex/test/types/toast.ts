import type { Html, HtmlBuilder } from "foldkit/html";

import { ToastStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";
import { Toast } from "./toast-module.ts";

export const notifications = (model: typeof Toast.Model.Type, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: toastView,
    viewInputs: {
      position: "BottomRight",
      ariaLabel: "Notifications",
      entryToView: (entry, { dismiss }) =>
        h.div(
          [sx(styles.body, entry.variant === "Error" && styles.error)],
          [h.p([], [entry.payload.text]), h.button([...dismiss], ["Dismiss"])],
        ),
    },
    toParentMessage: (message) => Message.GotToastMessage({ message }),
  });

const styles = stylex.create({
  // Every entry shares one class, so it animates on @foldkit/ui's data-closed.
  entry: {
    minInlineSize: 280,
    transitionProperty: "opacity, transform",
    transitionDuration: "200ms",
    opacity: { default: 1, ":is([data-closed])": 0 },
    transform: { default: "none", ":is([data-closed])": "translateY(0.5rem)" },
  },
  body: { padding: 16, backgroundColor: "white", color: "black" },
  error: { backgroundColor: "mistyrose" },
  dismiss: { minBlockSize: 44 },
});

const toastView = ToastStyle.view(Toast.view, {
  entry: styles.entry,
  dismiss: styles.dismiss,
});
