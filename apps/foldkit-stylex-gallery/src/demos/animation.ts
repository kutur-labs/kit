import type { Html, HtmlBuilder } from "foldkit/html";

import { Animation } from "@foldkit/ui";
import { AnimationStyle, sx } from "@kutur-kit/foldkit-stylex";
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

      // Animation hands the wait for its leave transition to the parent; the default waits for the
      // element's own transitions.
      return lift(
        Predicate.isTagged(next.outMessage, "StartedLeaveAnimating")
          ? { ...next, commands: [Animation.defaultLeaveCommand(next.model)] }
          : next,
      );
    },
  });

const styles = stylex.create({
  root: { display: "grid", justifyItems: "start", gap: 12, maxInlineSize: 360 },
  trigger: { minBlockSize: 44, paddingInline: 16, font: "inherit" },
  // The element @foldkit/ui keeps in the page while hidden, as animateSize asks.
  notes: {
    padding: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "gray",
    transitionProperty: "opacity, translate",
    transitionDuration: { default: "200ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  closed: { opacity: 0, translate: "0 -8px" },
  text: { margin: 0 },
});

const animationView = AnimationStyle.view(Animation.view, {
  element: (state) => [styles.notes, state.isClosed && styles.closed],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      h.button(
        [
          h.Type("button"),
          h.AriaControls("notes"),
          h.AriaExpanded(model.animation.isShowing),
          h.OnClick(Message.ClickedToggle()),
          sx(styles.trigger),
        ],
        [model.animation.isShowing ? "Hide notes" : "Show notes"],
      ),
      h.submodel({
        slotId: "notes",
        model: model.animation,
        view: animationView,
        viewInputs: {
          animateSize: true,
          content: h.p(
            [sx(styles.text)],
            ["The element stays in the page while hidden, its height animated to zero."],
          ),
        },
        toParentMessage: (message) => Message.GotAnimationMessage({ message }),
      }),
    ],
  );
