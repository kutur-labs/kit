import type { Example } from "../demo.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Popover } from "@kutur-kit/foldkit-stylex-theme/popover";
import { color, fontSize, fontWeight, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";

export const summary = "A panel anchored to its button that stays open until dismissed.";

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
    plain: Popover.init({ id: "plain", isAnimated: true }),
    inverted: Popover.init({ id: "inverted", isAnimated: true }),
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

// The inverted panel swaps surface and text. The greys mix those two, and the accent and the text
// on it default to them, where the tokens are defined, at :root, so the panel sets them too. Danger
// is a light-dark() pair of its own, so the panel swaps it. Forced colors replace a palette, so
// there the panel keeps the theme's tokens, whose system colors it would otherwise replace. Chromium
// also keeps an author's color in a forced element's computed -webkit-text-fill-color, which
// axe-core measures as the text's.
const unforced = "@media (forced-colors: none)";

const surface = "light-dark(#18181b, #fafafa)";

const text = "light-dark(#fafafa, #18181b)";

const styles = stylex.create({
  details: { display: "grid", gap: space.xs, margin: 0 },
  title: { margin: 0, fontWeight: fontWeight.medium },
  meta: {
    margin: 0,
    color: color.muted,
    fontSize: fontSize.sm,
    lineHeight: "1.125rem",
    fontVariantNumeric: "tabular-nums",
  },
  // Tokens set on a part reach it in the portal root; the theme's panel and arrow read them.
  inverted: {
    [color.surface]: { default: null, [unforced]: surface },
    [color.text]: { default: null, [unforced]: text },
    [color.subtle]: { default: null, [unforced]: `color-mix(in oklab, ${text} 5%, ${surface})` },
    [color.border]: { default: null, [unforced]: `color-mix(in oklab, ${text} 10%, ${surface})` },
    [color.control]: { default: null, [unforced]: `color-mix(in oklab, ${text} 50%, ${surface})` },
    [color.muted]: { default: null, [unforced]: `color-mix(in oklab, ${text} 62%, ${surface})` },
    [color.accent]: { default: null, [unforced]: text },
    [color.onAccent]: { default: null, [unforced]: surface },
    [color.danger]: { default: null, [unforced]: "light-dark(#f87171, #b91c1c)" },
  },
});

const invertedView = Popover.restyle({ panel: styles.inverted }).view;

const popover = (variant: Variant, model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: variant,
    model: model[variant],
    view: variant === "plain" ? Popover.view : invertedView,
    viewInputs: {
      anchor: { placement: "bottom-start", gap: 12, padding: viewportPadding },
      toView: ({ wrapper, button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [...wrapper],
          [
            h.button([...button], ["Details"]),
            ...(isVisible
              ? [
                  h.div([...backdrop]),
                  h.div(
                    [...panel],
                    [
                      h.div([...arrow]),
                      h.div(
                        [sx(styles.details)],
                        [
                          h.p([sx(styles.title)], ["Spring notes"]),
                          h.p([sx(styles.meta)], ["1,204 words, edited 12 minutes ago."]),
                        ],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotPopoverMessage({ variant, message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html => popover("plain", model, h);

export const examples: ReadonlyArray<Example<Model, Message>> = [
  {
    heading: "Inverted panel",
    code: "Popover.restyle({ panel: styles.inverted })",
    caption:
      "A layer on the panel sets every color token, which the panel and its arrow read in the portal.",
    view: (model, h) => popover("inverted", model, h),
  },
];
