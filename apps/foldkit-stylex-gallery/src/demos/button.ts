import type { Example } from "../demo.ts";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary =
  "Triggers an action. Disabled, it stays in the tab order, marked aria-disabled.";

export const Model = Schema.Struct({ count: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedAdd: {}, ClickedReset: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { count: 0 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAdd: () => ({ model: { count: model.count + 1 } }),
    ClickedReset: () => ({ model: { count: 0 } }),
  });

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: space.sm },
  // Tabular digits keep the buttons still as the count grows.
  count: {
    marginInlineStart: space.xs,
    color: color.muted,
    fontSize: fontSize.md,
    fontVariantNumeric: "tabular-nums",
  },
  // A token set on a part reaches that part alone. Under forced colors the fill keeps the accent's
  // Highlight, which the value would otherwise replace.
  danger: {
    [color.accent]: { default: color.danger, "@media (forced-colors: active)": "Highlight" },
  },
});

const primaryView = Button.restyle(Button.primary).view;

const quietView = Button.restyle(Button.quiet).view;

/** The primary button in the danger color, for an action that destroys something. */
export const dangerView = Button.restyle(Button.primary, { button: styles.danger }).view;

type ButtonView = typeof Button.view;

const add = (view: ButtonView, h: HtmlBuilder<Message>): Html =>
  view(
    { onClick: Message.ClickedAdd(), toView: ({ button }) => h.button([...button], ["Add one"]) },
    h,
  );

const reset = (view: ButtonView, isDisabled: boolean, h: HtmlBuilder<Message>): Html =>
  view(
    {
      onClick: Message.ClickedReset(),
      isDisabled,
      toView: ({ button }) => h.button([...button], ["Reset"]),
    },
    h,
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      add(Button.view, h),
      reset(Button.view, model.count === 0, h),
      h.output([sx(styles.count)], [`Count: ${model.count}`]),
    ],
  );

export const examples: ReadonlyArray<Example<Model, Message>> = [
  {
    heading: "Primary",
    code: "Button.restyle(Button.primary)",
    caption: "Fills the main action with the accent.",
    view: (_model, h) => add(primaryView, h),
  },
  {
    heading: "Quiet",
    code: "Button.restyle(Button.quiet)",
    caption: "Draws the label alone, and fills it under the pointer.",
    view: (_model, h) => reset(quietView, false, h),
  },
  {
    heading: "Danger",
    code: "Button.restyle(Button.primary, { button: styles.danger })",
    caption: "A layer sets color.accent to color.danger on this button alone.",
    view: (_model, h) => reset(dangerView, false, h),
  },
];
