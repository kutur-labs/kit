import type { Html, HtmlBuilder } from "foldkit/html";

import { RadioGroup } from "@kutur-kit/foldkit-stylex-theme/radio-group";
import { Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Picks one of a few options, all in view.";

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
  model: { radioGroup: RadioGroup.init({ id: "plan" }), plan: "Free" },
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "plan",
    model: model.radioGroup,
    view: Plans.view,
    viewInputs: {
      options: Plan.literals,
      selectedValue: Option.some(model.plan),
      ariaLabel: "Plan",
      hasOptionDescription: () => true,
      toView: ({ group, options }) =>
        h.div(
          [...group],
          options.map((option) =>
            h.button(
              [...option.option],
              [
                RadioGroup.mark(option),
                h.span([...option.label], [option.value]),
                h.span([...option.description], [descriptions[option.value]]),
              ],
            ),
          ),
        ),
    },
    toParentMessage: (message) => Message.GotRadioGroupMessage({ message }),
  });
