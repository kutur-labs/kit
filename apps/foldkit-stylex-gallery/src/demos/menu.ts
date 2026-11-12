import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Menu } from "@kutur-kit/foldkit-stylex-theme/menu";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";

export const summary = "A button that opens a list of actions.";

const Action = Schema.Literals(["Rename", "Duplicate", "Print", "Archive", "Delete"]);

type Action = typeof Action.Type;

const styles = stylex.create({
  // The status sits beside the button, where the panel opening below never covers it.
  demo: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.md },
  status: { margin: 0, color: color.muted, fontSize: fontSize.sm },
  // The one action that destroys something takes the danger color, so it stands out from the rest.
  // Under forced colors it inherits the item's, HighlightText while active, which danger's
  // CanvasText would hide on Highlight.
  danger: { color: { default: color.danger, "@media (forced-colors: active)": null } },
});

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

const groupOf = (action: Action) =>
  action === "Archive" || action === "Delete" ? "Manage" : "Document";

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.demo)],
    [
      h.submodel({
        slotId: "actions",
        model: model.actions,
        view: Actions.view,
        viewInputs: {
          items: Action.literals,
          itemGroupKey: groupOf,
          groupToHeading: (group) => ({ content: h.span([], [group]) }),
          anchor: { placement: "bottom-start", gap: 4, padding: viewportPadding },
          buttonContent: Menu.buttonContent("Actions", model.actions),
          itemToConfig: (action) => ({
            content: h.span([sx(action === "Delete" && styles.danger)], [action]),
          }),
        },
        toParentMessage: (message) => Message.GotActionsMessage({ message }),
      }),
      h.p(
        [sx(styles.status)],
        [
          Option.match(model.lastAction, {
            onNone: () => "No action chosen yet.",
            onSome: (action) => `Chose ${action}.`,
          }),
        ],
      ),
    ],
  );
