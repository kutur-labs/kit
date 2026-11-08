import type { Html, HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import { PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";
import { popoverTheme } from "@kutur-kit/foldkit-stylex-theme/popover";
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Variant = Schema.Literals(["plain", "inverted"]);

type Variant = typeof Variant.Type;

export const Model = Schema.Struct({ plain: Popover.Model, inverted: Popover.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotPopoverMessage: { variant: Variant, message: Popover.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    plain: Popover.init({ id: "themed-plain", isAnimated: true }),
    inverted: Popover.init({ id: "themed-inverted", isAnimated: true }),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPopoverMessage: ({ variant, message }) => {
      const next = Popover.update(model[variant], message);

      return {
        model: { ...model, [variant]: next.model },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotPopoverMessage({ variant, message }),
        ),
      };
    },
  });

const styles = stylex.create({
  row: { display: "flex", flexWrap: "wrap", gap: 16, paddingBlockEnd: 160 },
  // Tokens set on a part reach it in the portal root; the theme's panel and arrow read them.
  inverted: {
    [color.surface]: "light-dark(#18181b, #fafafa)",
    [color.text]: "light-dark(#fafafa, #18181b)",
  },
});

const plainView = PopoverStyle.view(Popover.view, popoverTheme);

const invertedView = PopoverStyle.view(Popover.view, popoverTheme, { panel: styles.inverted });

const popover = (variant: Variant, model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: variant,
    model: model[variant],
    view: variant === "plain" ? plainView : invertedView,
    viewInputs: {
      anchor: { placement: "bottom-start", gap: 12 },
      toView: ({ wrapper, button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [...wrapper],
          [
            h.button([...button], [variant === "plain" ? "Details" : "Inverted details"]),
            ...(isVisible
              ? [
                  h.div([...backdrop]),
                  h.div(
                    [...panel],
                    [h.div([...arrow]), h.p([], ["The theme's panel, portaled to the page."])],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotPopoverMessage({ variant, message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    Variant.literals.map((variant) => popover(variant, model, h)),
  );
