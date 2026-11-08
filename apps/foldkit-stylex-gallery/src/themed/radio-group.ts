import type { Html, HtmlBuilder } from "foldkit/html";

import { RadioGroup } from "@foldkit/ui";
import { RadioGroupStyle, sx } from "@kutur-kit/foldkit-stylex";
import { radioGroupMark, radioGroupTheme } from "@kutur-kit/foldkit-stylex-theme/radio-group";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Plan = Schema.Literals(["Free", "Pro", "Team"]);

type Plan = typeof Plan.Type;

const Plans = RadioGroup.create<Plan>();

const descriptions: Readonly<Record<Plan, string>> = {
  Free: "One project, public only.",
  Pro: "Unlimited projects and drafts.",
  Team: "Shared drafts for a whole team.",
};

export const Model = Schema.Struct({ radioGroup: RadioGroup.Model, plan: Plan });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotRadioGroupMessage: { message: RadioGroup.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { radioGroup: RadioGroup.init({ id: "themed-plan" }), plan: "Free" },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRadioGroupMessage: ({ message }) => {
      const next = Plans.update(model.radioGroup, message);

      return {
        model: { radioGroup: next.model, plan: next.outMessage?.value ?? model.plan },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotRadioGroupMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  group: { maxInlineSize: "20rem" },
  strong: { fontWeight: 600 },
});

// The app's own layer over the look, reading the same state: the selected plan's name in bold.
const radioGroupView = RadioGroupStyle.view(Plans.view, radioGroupTheme, {
  group: styles.group,
  label: (state) => state.isSelected && styles.strong,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "plan",
    model: model.radioGroup,
    view: radioGroupView,
    viewInputs: {
      options: Plan.literals,
      selectedValue: Option.some(model.plan),
      ariaLabel: "Plan",
      isOptionDisabled: (plan) => plan === "Team",
      hasOptionDescription: () => true,
      toView: ({ group, options }) =>
        h.div(
          [...group],
          options.map((option) =>
            h.button(
              [...option.option],
              [
                h.span([sx(radioGroupMark.mark, option.isSelected && radioGroupMark.marked)], []),
                h.span([...option.label], [option.value]),
                h.span([...option.description], [descriptions[option.value]]),
              ],
            ),
          ),
        ),
    },
    toParentMessage: (message) => Message.GotRadioGroupMessage({ message }),
  });
