import type { Html, HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import { sx, TooltipStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Tooltip.Model;

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotTooltipMessage: { message: Tooltip.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: Tooltip.init({ id: "save" }) });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTooltipMessage: ({ message }) => {
      const next = Tooltip.update(model, message);

      return {
        model: next.model,
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotTooltipMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  // Room above the trigger, where the panel opens.
  row: { paddingBlockStart: 64 },
  trigger: { minBlockSize: 44, minInlineSize: 96, font: "inherit" },
  triggerOpen: { fontWeight: 700 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 4,
    backgroundColor: "black",
    color: "white",
    fontSize: 14,
  },
});

const tooltipView = TooltipStyle.view(Tooltip.view, {
  trigger: (state) => [styles.trigger, state.isVisible && styles.triggerOpen],
  panel: styles.panel,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "save",
    model,
    view: tooltipView,
    viewInputs: {
      anchor: { placement: "top", gap: 8 },
      // Rendered only while visible: Floating UI shows the panel once it places it.
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...trigger], ["Save"]),
            ...(isVisible ? [h.div([...panel], ["Saves the draft without publishing it."])] : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotTooltipMessage({ message }),
  });
