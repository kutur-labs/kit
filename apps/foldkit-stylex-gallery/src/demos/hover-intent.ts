import type { Html, HtmlBuilder } from "foldkit/html";

import { HoverIntent } from "@foldkit/ui";
import { HoverIntentStyle, sx } from "@kutur-kit/foldkit-stylex";
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
  // HoverIntent positions nothing: the panel hangs below the trigger, in room kept free for it.
  wrapper: { position: "relative", display: "inline-block", marginBlockEnd: 160 },
  trigger: { minBlockSize: 44, minInlineSize: 96, font: "inherit" },
  triggerOpen: { fontWeight: 700 },
  panel: {
    position: "absolute",
    insetBlockStart: "100%",
    insetInlineStart: 0,
    zIndex: 1,
    inlineSize: 240,
    marginBlockStart: 4,
    padding: 16,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
  },
  link: { display: "inline-flex", alignItems: "center", minBlockSize: 44, color: "inherit" },
});

const hoverIntentView = HoverIntentStyle.view(HoverIntent.view, {
  trigger: (state) => [styles.trigger, state.isVisible && styles.triggerOpen],
  panel: styles.panel,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "related",
    model,
    view: hoverIntentView,
    viewInputs: {
      focusTriggerSelector: "#related-trigger",
      // HoverIntent adds no ARIA, so the trigger says what it opens.
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
            ...(isVisible
              ? [
                  h.div(
                    [...panel, h.Id("related-panel")],
                    [
                      h.p([], ["Popover opens on click and stays open until dismissed."]),
                      h.a([h.Href("/popover"), sx(styles.link)], ["Open the Popover page"]),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotHoverIntentMessage({ message }),
  });
