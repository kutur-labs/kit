import type { Html, HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import { MenuStyle, sx } from "@kutur-kit/foldkit-stylex";
import { menuButton, menuIndicator, menuTheme } from "@kutur-kit/foldkit-stylex-theme/menu";
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Action = Schema.Literals(["Rename", "Duplicate", "Print", "Archive", "Delete"]);

type Action = typeof Action.Type;

const Actions = Menu.create<Action>();

const Variant = Schema.Literals(["plain", "accent"]);

type Variant = typeof Variant.Type;

export const Model = Schema.Struct({
  plain: Menu.Model,
  accent: Menu.Model,
  lastAction: Schema.Option(Action),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotActionsMessage: { variant: Variant, message: Menu.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    plain: Menu.init({ id: "themed-plain-actions", isAnimated: true }),
    accent: Menu.init({ id: "themed-accent-actions", isAnimated: true }),
    lastAction: Option.none(),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotActionsMessage: ({ variant, message }) => {
      const next = Actions.update(model[variant], message);

      return {
        model: {
          ...model,
          [variant]: next.model,
          lastAction: next.outMessage ? Option.some(next.outMessage.value) : model.lastAction,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotActionsMessage({ variant, message }),
        ),
      };
    },
  });

const styles = stylex.create({
  demo: { display: "grid", justifyItems: "start", gap: 16, paddingBlockEnd: 320 },
  row: { display: "flex", flexWrap: "wrap", gap: 16 },
  // Layered over the look: the active item takes the accent instead of the hover color.
  activeItem: { backgroundColor: color.accent, color: color.onAccent },
});

const plainView = MenuStyle.view(Actions.view, menuTheme);

// A later layer wins property by property, so the look's other item styles stay.
const accentView = MenuStyle.view(Actions.view, menuTheme, {
  item: (state) => state.isActive && styles.activeItem,
});

const label = { plain: "Actions", accent: "Accent actions" } satisfies Record<Variant, string>;

const groupOf = (action: Action) =>
  action === "Archive" || action === "Delete" ? "Manage" : "Document";

const menu = (variant: Variant, model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: variant,
    model: model[variant],
    view: variant === "plain" ? plainView : accentView,
    viewInputs: {
      items: Action.literals,
      isItemDisabled: (action) => action === "Print",
      itemGroupKey: groupOf,
      groupToHeading: (group) => ({ content: h.span([], [group]) }),
      anchor: { placement: "bottom-start", gap: 4 },
      buttonContent: h.span(
        [sx(menuButton.content)],
        [
          h.span([], [label[variant]]),
          h.span(
            [
              h.AriaHidden(true),
              sx(menuIndicator.chevron, model[variant].isOpen && menuIndicator.open),
            ],
            ["▾"],
          ),
        ],
      ),
      itemToConfig: (action) => ({ content: h.span([], [action]) }),
    },
    toParentMessage: (message) => Message.GotActionsMessage({ variant, message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.demo)],
    [
      h.div(
        [sx(styles.row)],
        Variant.literals.map((variant) => menu(variant, model, h)),
      ),
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
