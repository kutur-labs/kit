import type { Html, HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import { MenuStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Action = Schema.Literals(["Rename", "Duplicate", "Print", "Archive", "Delete"]);

type Action = typeof Action.Type;

const Actions = Menu.create<Action>();

export const Model = Schema.Struct({ actions: Menu.Model, lastAction: Schema.Option(Action) });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotActionsMessage: { message: Menu.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { actions: Menu.init({ id: "actions", isAnimated: true }), lastAction: Option.none() },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotActionsMessage: ({ message }) => {
      const next = Actions.update(model.actions, message);

      return {
        model: {
          actions: next.model,
          lastAction: next.outMessage ? Option.some(next.outMessage.value) : model.lastAction,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotActionsMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  demo: { display: "grid", justifyItems: "start", gap: 16, paddingBlockEnd: 320 },
  button: { minBlockSize: 44, minInlineSize: 160, font: "inherit" },
  buttonOpen: { outlineWidth: 2, outlineStyle: "solid" },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  items: {
    minInlineSize: 200,
    padding: 4,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
    transitionProperty: "opacity",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  itemsClosed: { opacity: 0 },
  item: { display: "flex", alignItems: "center", minBlockSize: 44, paddingInline: 12 },
  itemActive: { backgroundColor: "gainsboro" },
  itemDisabled: { opacity: 0.5 },
  heading: { paddingBlock: 4, paddingInline: 12, fontSize: 14, fontWeight: 700 },
  // @foldkit/ui renders a separator between groups only when this part is styled.
  separator: { blockSize: 1, marginBlock: 4, backgroundColor: "silver" },
});

const actionsView = MenuStyle.view(Actions.view, {
  button: (state) => [styles.button, state.isVisible && styles.buttonOpen],
  items: (state) => [styles.items, state.isClosed && styles.itemsClosed],
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isDisabled && styles.itemDisabled,
  ],
  heading: styles.heading,
  separator: styles.separator,
});

const groupOf = (action: Action) =>
  action === "Archive" || action === "Delete" ? "Manage" : "Document";

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.demo)],
    [
      h.submodel({
        slotId: "actions",
        model: model.actions,
        view: actionsView,
        viewInputs: {
          items: Action.literals,
          isItemDisabled: (action) => action === "Print",
          itemGroupKey: groupOf,
          groupToHeading: (group) => ({ content: h.span([], [group]) }),
          anchor: { placement: "bottom-start", gap: 4 },
          buttonContent: h.span([], ["Actions"]),
          itemToConfig: (action) => ({ content: h.span([], [action]) }),
        },
        toParentMessage: (message) => Message.GotActionsMessage({ message }),
      }),
      h.p(
        [],
        [
          Option.match(model.lastAction, {
            onNone: () => "No action chosen yet.",
            onSome: (action) => `Chose ${action}.`,
          }),
        ],
      ),
    ],
  );
