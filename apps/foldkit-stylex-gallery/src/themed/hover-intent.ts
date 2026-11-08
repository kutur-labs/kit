import type { Html, HtmlBuilder } from "foldkit/html";

import { HoverIntent } from "@foldkit/ui";
import { HoverIntentStyle, sx } from "@kutur-kit/foldkit-stylex";
import { hoverIntentTheme } from "@kutur-kit/foldkit-stylex-theme/hover-intent";
import { color, size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

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
  wrapper: { position: "relative", display: "inline-block", marginBlockEnd: 160 },
  // The app's layer over the look: HoverIntent positions nothing, so the panel hangs below the
  // trigger here.
  placed: {
    position: "absolute",
    insetBlockStart: "100%",
    insetInlineStart: 0,
    zIndex: 1,
    inlineSize: "16rem",
    marginBlockStart: space.xs,
  },
  text: { marginBlock: 0 },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: size.target,
    color: color.text,
    outlineColor: color.focus,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
});

const hoverIntentView = HoverIntentStyle.view(HoverIntent.view, hoverIntentTheme, {
  panel: styles.placed,
});

// Kept rendered while hidden, so the look fades it out; hidden, it takes no hover or focus.
export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "related",
    model,
    view: hoverIntentView,
    viewInputs: {
      focusTriggerSelector: "#themed-related-trigger",
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [sx(styles.wrapper)],
          [
            h.button(
              [
                ...trigger,
                h.Id("themed-related-trigger"),
                h.AriaExpanded(isVisible),
                h.AriaControls("themed-related-panel"),
              ],
              ["Related"],
            ),
            h.div(
              [...panel, h.Id("themed-related-panel")],
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
