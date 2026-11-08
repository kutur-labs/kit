import type { Html, HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import { SliderStyle } from "@kutur-kit/foldkit-stylex";
import { sliderTheme } from "@kutur-kit/foldkit-stylex-theme/slider";
import { size } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import { Option, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ slider: Slider.Model, volume: Schema.Finite });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotSliderMessage: { message: Slider.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { slider: Slider.init({ id: "themed-volume", min: 0, max: 100, step: 1 }), volume: 40 },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSliderMessage: ({ message }) => {
      const next = Slider.update(model.slider, message);

      return {
        model: { slider: next.model, volume: next.outMessage?.value ?? model.volume },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotSliderMessage({ message }),
        ),
      };
    },
  });

export const subscriptions = Subscription.lift({
  volumePointer: Slider.subscriptions.dragPointer,
  volumeEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: (model) => Option.some(model.slider),
  toParentMessage: (message) => Message.GotSliderMessage({ message }),
});

const sliderView = SliderStyle.view(Slider.view, sliderTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "volume",
    model: model.slider,
    view: sliderView,
    viewInputs: {
      value: model.volume,
      // The thumb stays inside the track; @foldkit/ui insets its travel by the thumb's size.
      thumbAlignment: "Edge",
      thumbSize: size.thumb,
      toView: ({ root, label, track, filledTrack, thumb }) =>
        h.div(
          [...root],
          [
            h.span([...label], [`Volume ${model.volume}`]),
            h.div([...track], [h.div([...filledTrack]), h.div([...thumb])]),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotSliderMessage({ message }),
  });
