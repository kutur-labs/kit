import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Animation } from "@kutur-kit/foldkit-stylex-theme/animation";
import { Button } from "@kutur-kit/foldkit-stylex-theme/button";
import { color, fontSize, radius, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Predicate, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Shows and hides content with a transition on the way in and out.";

export const Model = Schema.Struct({ animation: Animation.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedToggle: {},
  GotAnimationMessage: { message: Animation.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { animation: Animation.init({ id: "notes" }) },
});

const lift = (
  next: Readonly<{ model: Animation.Model; commands?: Update.Commands<Animation.Message> }>,
): Update.Return<Model, Message> => ({
  model: { animation: next.model },
  commands: Command.mapMessages(next.commands, (message) =>
    Message.GotAnimationMessage({ message }),
  ),
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedToggle: () => lift(Animation.toggle(model.animation)),
    GotAnimationMessage: ({ message }) => {
      const next = Animation.update(model.animation, message);

      return lift(
        Predicate.isTagged(next.outMessage, "StartedLeaveAnimating")
          ? { ...next, commands: [Animation.defaultLeaveCommand(next.model)] }
          : next,
      );
    },
  });

const styles = stylex.create({
  // At the top of the canvas, so the button stays put as the notes appear below it.
  root: {
    alignSelf: "start",
    display: "grid",
    justifyItems: "start",
    gap: space.sm,
    inlineSize: "100%",
    maxInlineSize: "24rem",
  },
  // The app's card inside the element, which the theme only moves.
  card: {
    margin: 0,
    padding: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    color: color.muted,
    fontSize: fontSize.md,
    lineHeight: "1.25rem",
  },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      Button.view(
        {
          onClick: Message.ClickedToggle(),
          toView: ({ button }) =>
            h.button(
              [...button, h.AriaExpanded(model.animation.isShowing)],
              [model.animation.isShowing ? "Hide notes" : "Show notes"],
            ),
        },
        h,
      ),
      h.submodel({
        slotId: "notes",
        model: model.animation,
        view: Animation.view,
        viewInputs: {
          content: h.p(
            [sx(styles.card)],
            ["The second stanza still reads flat; try ending on the image of the bridge."],
          ),
        },
        toParentMessage: (message) => Message.GotAnimationMessage({ message }),
      }),
    ],
  );
