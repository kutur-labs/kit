import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { HoverIntent } from "@kutur-kit/foldkit-stylex-theme/hover-intent";
import { color, size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary =
  "Opens a panel once the pointer rests on its trigger or the trigger takes focus.";

export const Model = HoverIntent.Model;

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotHoverIntentMessage: { message: HoverIntent.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: HoverIntent.init() });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotHoverIntentMessage: ({ message }) => {
      const next = HoverIntent.update(model, message);

      return {
        model: next.model,
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotHoverIntentMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // The panel hangs below the trigger outside the layout, over the canvas's edge if need be.
  wrapper: { position: "relative", display: "inline-block" },
  // The app's layer over the look: HoverIntent positions nothing, so the panel hangs centred below
  // the trigger here, growing from its top, and narrows to fit a small screen.
  placed: {
    position: "absolute",
    insetBlockStart: "100%",
    // Physical, as translate is: centred either way.
    left: "50%",
    zIndex: 1,
    inlineSize: "min(16rem, 100vw - 2rem)",
    marginBlockStart: space.xs,
    transformOrigin: "top",
    translate: "-50% 0",
  },
  text: { marginBlock: 0 },
  // A size.target target whose extra height overlaps the panel's padding below it, so the text keeps an
  // even distance from the panel's top and bottom edges.
  link: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: size.target,
    marginBlockEnd: `calc((1lh - ${size.target}) / 2)`,
    color: color.text,
    outlineColor: color.accent,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
});

const hoverIntentView = HoverIntent.restyle({ panel: styles.placed }).view;

// Kept rendered while hidden, so the look fades it out; hidden, it takes no hover or focus.
export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "related",
    model,
    view: hoverIntentView,
    viewInputs: {
      focusTriggerSelector: "#related-trigger",
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [sx(styles.wrapper)],
          [
            h.button(
              [
                ...trigger,
                h.Id("related-trigger"),
                h.AriaExpanded(isVisible),
                h.AriaControls("related-panel"),
              ],
              ["Related"],
            ),
            h.div(
              [...panel, h.Id("related-panel")],
              [
                h.p([sx(styles.text)], ["Popover opens on click and stays open until dismissed."]),
                h.a([h.Href("/popover"), sx(styles.link)], ["Open the Popover page"]),
              ],
            ),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotHoverIntentMessage({ message }),
  });
