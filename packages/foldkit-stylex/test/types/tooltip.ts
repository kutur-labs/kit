import type { Html, HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@foldkit/ui";
import { TooltipStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotSaveTipMessage: { message: Tooltip.Message } });

type Message = typeof Message.Type;

// `toParentMessage` compiles only while the styled view keeps Tooltip's Message.
export const saveTip = (model: Tooltip.Model, isDisabled: boolean, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: tooltipView,
    viewInputs: {
      anchor: { placement: "top", gap: 8 },
      isDisabled,
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [],
          [
            h.button([...trigger], ["Zapisz"]),
            ...(isVisible ? [h.div([...panel], ["Zapisuje szkic"])] : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotSaveTipMessage({ message }),
  });

const styles = stylex.create({
  trigger: { minBlockSize: 44, paddingInline: 12 },
  triggerOpen: { textDecorationLine: "underline" },
  triggerDisabled: { opacity: 0.5 },
  // The panel renders outside this view, in Foldkit's portal root, so it sets its own color.
  panel: {
    paddingBlock: 4,
    paddingInline: 8,
    backgroundColor: "black",
    color: "white",
    fontSize: "0.875rem",
  },
});

const tooltipView = TooltipStyle.view(Tooltip.view, {
  trigger: (state) => [
    styles.trigger,
    state.isVisible && styles.triggerOpen,
    state.isDisabled && styles.triggerDisabled,
  ],
  panel: styles.panel,
});
