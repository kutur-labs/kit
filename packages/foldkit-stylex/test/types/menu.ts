import type { Html, HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import { MenuStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotActionsMessage: { message: Menu.Message } });

type Message = typeof Message.Type;

type Action = "copy" | "paste" | "delete";

/** Declared once at module scope, as @foldkit/ui asks. */
export const ActionMenu = Menu.create<Action>();

// Indexing by `item` compiles only while MenuStyle.view infers Item as Action, not string.
const labels: Readonly<Record<Action, string>> = {
  copy: "Kopiuj",
  paste: "Wklej",
  delete: "Usuń",
};

export const actions = (
  model: Menu.Model,
  isButtonDisabled: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: menuView,
    viewInputs: {
      items: ["copy", "paste", "delete"],
      isButtonDisabled,
      isItemDisabled: (item) => item === "delete",
      itemGroupKey: (item) => (item === "delete" ? "danger" : "edit"),
      groupToHeading: (group) =>
        group === "edit" ? { content: h.span([], ["Edycja"]) } : undefined,
      anchor: { placement: "bottom-end", gap: 4 },
      buttonContent: h.span([], ["Akcje"]),
      itemToConfig: (item, state) => ({
        content: h.span([sx(styles.label, state.isActive && styles.labelActive)], [labels[item]]),
      }),
    },
    toParentMessage: (message) => Message.GotActionsMessage({ message }),
  });

const styles = stylex.create({
  button: { minBlockSize: 44, paddingInline: 12 },
  buttonOpen: { fontWeight: 700 },
  buttonDisabled: { opacity: 0.5 },
  panel: {
    minInlineSize: 192,
    backgroundColor: "white",
    color: "black",
    transitionProperty: "opacity",
    transitionDuration: "120ms",
  },
  panelClosed: { opacity: 0 },
  item: { minBlockSize: 44, paddingInline: 12, display: "flex", alignItems: "center" },
  itemActive: { backgroundColor: "whitesmoke" },
  itemDisabled: { opacity: 0.5 },
  heading: { fontSize: 12, paddingInline: 12 },
  separator: { blockSize: 1, backgroundColor: "gainsboro" },
  label: { textDecorationLine: "none" },
  labelActive: { textDecorationLine: "underline" },
});

const menuView = MenuStyle.view(ActionMenu.view, {
  button: (state) => [
    styles.button,
    state.isVisible && styles.buttonOpen,
    state.isButtonDisabled && styles.buttonDisabled,
  ],
  items: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isDisabled && styles.itemDisabled,
  ],
  heading: styles.heading,
  separator: styles.separator,
});
