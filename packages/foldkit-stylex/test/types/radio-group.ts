import type { Html, HtmlBuilder } from "foldkit/html";

import { RadioGroup } from "@foldkit/ui";
import { RadioGroupStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { defineMessageUnion } from "foldkit/message";

type Plan = "Free" | "Pro";

/** Declared once at module scope, as @foldkit/ui asks. */
export const PlanRadioGroup = RadioGroup.create<Plan>();

const Message = defineMessageUnion({ GotPlanMessage: { message: RadioGroup.Message } });

type Message = typeof Message.Type;

// Indexing by `option.value` compiles only while the styled view infers Value as Plan, not string.
const labels: Readonly<Record<Plan, string>> = { Free: "Darmowy", Pro: "Pro" };

export const plan = (model: RadioGroup.Model, selected: Plan, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: radioGroupView,
    viewInputs: {
      options: ["Free", "Pro"],
      selectedValue: Option.some(selected),
      ariaLabel: "Plan",
      toView: ({ group, options }) =>
        h.div(
          [...group],
          options.map((option) =>
            h.button(
              [...option.option],
              [
                h.span([sx(styles.mark, option.isSelected && styles.marked)], []),
                h.span([...option.label], [labels[option.value]]),
              ],
            ),
          ),
        ),
    },
    toParentMessage: (message) => Message.GotPlanMessage({ message }),
  });

const styles = stylex.create({
  group: { display: "flex", flexDirection: "column", gap: 8 },
  horizontal: { flexDirection: "row" },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minBlockSize: 44,
    outline: { default: "none", ":focus-visible": "2px solid royalblue" },
  },
  disabled: { opacity: 0.5 },
  mark: {
    inlineSize: 16,
    blockSize: 16,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
  },
  marked: { borderWidth: 5 },
});

const radioGroupView = RadioGroupStyle.view(PlanRadioGroup.view, {
  group: (state) => [styles.group, state.orientation === "Horizontal" && styles.horizontal],
  option: (state) => [styles.option, state.isDisabled && styles.disabled],
});
