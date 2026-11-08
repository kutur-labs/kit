import type { Html, HtmlBuilder } from "foldkit/html";

import { Animation, Button } from "@foldkit/ui";
import { AnimationStyle, ButtonStyle, sx } from "@kutur-kit/foldkit-stylex";
import { animationTheme } from "@kutur-kit/foldkit-stylex-theme/animation";
import { buttonTheme } from "@kutur-kit/foldkit-stylex-theme/button";
import { color, radius, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Predicate, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ animation: Animation.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ClickedToggle: {},
  GotAnimationMessage: { message: Animation.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { animation: Animation.init({ id: "themed-notes" }) },
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
  root: { display: "grid", justifyItems: "start", gap: space.sm, maxInlineSize: "24rem" },
  // The app's card, layered over the look: it also slides down, so it adds translate to the
  // properties the look transitions.
  card: {
    padding: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    transitionProperty: "opacity, scale, translate",
  },
  raised: { translate: `0 calc(-1 * ${space.sm})` },
  text: { margin: 0 },
});

const animationView = AnimationStyle.view(Animation.view, animationTheme, {
  element: (state) => [styles.card, state.isClosed && styles.raised],
});

const buttonView = ButtonStyle.view(Button.view, buttonTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      buttonView(
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
        view: animationView,
        viewInputs: {
          content: h.p(
            [sx(styles.text)],
            ["Without animateSize, @foldkit/ui removes the element once it has left."],
          ),
        },
        toParentMessage: (message) => Message.GotAnimationMessage({ message }),
      }),
    ],
  );
