import type { Html, HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import { sx, TooltipStyle } from "@kutur-kit/foldkit-stylex";
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import { tooltipTheme } from "@kutur-kit/foldkit-stylex-theme/tooltip";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Variant = Schema.Literals(["plain", "inverted"]);

type Variant = typeof Variant.Type;

export const Model = Schema.Struct({ plain: Tooltip.Model, inverted: Tooltip.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotTooltipMessage: { variant: Variant, message: Tooltip.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    plain: Tooltip.init({ id: "themed-plain" }),
    inverted: Tooltip.init({ id: "themed-inverted" }),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTooltipMessage: ({ variant, message }) => {
      const next = Tooltip.update(model[variant], message);

      return {
        model: { ...model, [variant]: next.model },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotTooltipMessage({ variant, message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // Room above the triggers, where the panels open.
  row: { display: "flex", flexWrap: "wrap", gap: 16, paddingBlockStart: 64 },
  // Tokens set on a part reach it in the portal root; the theme's panel reads them.
  inverted: {
    [color.surface]: "light-dark(#18181b, #fafafa)",
    [color.text]: "light-dark(#fafafa, #18181b)",
  },
});

const plainView = TooltipStyle.view(Tooltip.view, tooltipTheme);

const invertedView = TooltipStyle.view(Tooltip.view, tooltipTheme, { panel: styles.inverted });

const tooltip = (variant: Variant, model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: variant,
    model: model[variant],
    view: variant === "plain" ? plainView : invertedView,
    viewInputs: {
      anchor: { placement: "top", gap: 8 },
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [],
          [
            h.button([...trigger], [variant === "plain" ? "Save" : "Inverted save"]),
            ...(isVisible ? [h.div([...panel], ["Saves the draft without publishing it."])] : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotTooltipMessage({ variant, message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    Variant.literals.map((variant) => tooltip(variant, model, h)),
  );
