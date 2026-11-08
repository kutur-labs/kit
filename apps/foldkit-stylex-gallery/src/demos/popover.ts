import type { Html, HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import { PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Side = Schema.Literals(["top", "right", "bottom", "left"]);

type Side = typeof Side.Type;

export const Model = Schema.Struct({
  top: Popover.Model,
  right: Popover.Model,
  bottom: Popover.Model,
  left: Popover.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotPopoverMessage: { side: Side, message: Popover.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    top: Popover.init({ id: "top", isAnimated: true }),
    right: Popover.init({ id: "right", isAnimated: true }),
    bottom: Popover.init({ id: "bottom", isAnimated: true }),
    left: Popover.init({ id: "left", isAnimated: true }),
  },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPopoverMessage: ({ side, message }) => {
      const next = Popover.update(model[side], message);

      return {
        model: { ...model, [side]: next.model },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotPopoverMessage({ side, message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // Room on every side, so each panel opens where it is placed.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, max-content)",
    justifyContent: "center",
    gap: 24,
    paddingBlock: 160,
  },
  trigger: { minBlockSize: 44, minInlineSize: 96, font: "inherit" },
  triggerOpen: { fontWeight: 700 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    inlineSize: 192,
    padding: 16,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
    transitionProperty: "opacity, scale",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  panelClosed: { opacity: 0, scale: 0.95 },
  backdrop: { backgroundColor: "rgb(0 0 0 / 0.1)" },
  // A square box: the triangle fills its outer half, pointing up. The package turns it.
  arrow: {
    inlineSize: 16,
    blockSize: 16,
    backgroundColor: "white",
    clipPath: "polygon(50% 0, 100% 50%, 0 50%)",
  },
});

const popoverView = PopoverStyle.view(Popover.view, {
  button: (state) => [styles.trigger, state.isVisible && styles.triggerOpen],
  panel: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  backdrop: styles.backdrop,
  arrow: styles.arrow,
});

const popover = (side: Side, model: Popover.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: side,
    model,
    view: popoverView,
    viewInputs: {
      anchor: { placement: side, gap: 12 },
      toView: ({ wrapper, button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [...wrapper],
          [
            h.button([...button], [`Opens ${side}`]),
            ...(isVisible
              ? [
                  h.div([...backdrop]),
                  h.div([...panel], [h.div([...arrow]), h.p([], [`Placed ${side}.`])]),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotPopoverMessage({ side, message }),
  });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.grid)],
    Side.literals.map((side) => popover(side, model[side], h)),
  );
