import type { Html, HtmlBuilder } from "foldkit/html";

import { Tooltip } from "@kutur-kit/foldkit-stylex-theme/tooltip";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";

export const summary = "A short label that shows while its trigger is hovered or focused.";

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

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "save",
    model,
    view: Tooltip.view,
    viewInputs: {
      anchor: { placement: "top", gap: 8, padding: viewportPadding },
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [],
          [
            h.button([...trigger], ["Save"]),
            ...(isVisible ? [h.div([...panel], ["Saves the draft without publishing it."])] : []),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotTooltipMessage({ message }),
  });
