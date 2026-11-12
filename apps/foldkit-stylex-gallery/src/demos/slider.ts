import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Slider } from "@kutur-kit/foldkit-stylex-theme/slider";
import { color, size } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Picks a number in a range by dragging or with the arrow keys.";

export const Model = Schema.Struct({ slider: Slider.Model, volume: Schema.Finite });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotSliderMessage: { message: Slider.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { slider: Slider.init({ id: "volume", min: 0, max: 100, step: 1 }), volume: 40 },
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

const styles = stylex.create({
  // The slider fills its container, so the container sets its width.
  field: { inlineSize: "100%", maxInlineSize: "20rem" },
  value: { color: color.muted },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.field)],
    [
      h.submodel({
        slotId: "volume",
        model: model.slider,
        view: Slider.view,
        viewInputs: {
          value: model.volume,
          // The thumb stays inside the track; @foldkit/ui insets its travel by the thumb's size.
          thumbAlignment: "Edge",
          thumbSize: size.mark,
          toView: ({ root, label, track, filledTrack, thumb }) =>
            h.div(
              [...root],
              [
                h.span(
                  [...label],
                  // The thumb announces the value, so the label's copy is hidden from the name.
                  ["Volume", h.span([h.AriaHidden(true), sx(styles.value)], [`${model.volume}%`])],
                ),
                h.div([...track], [h.div([...filledTrack]), h.div([...thumb])]),
              ],
            ),
        },
        toParentMessage: (message) => Message.GotSliderMessage({ message }),
      }),
    ],
  );
