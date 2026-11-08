import type { Html, HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import { SliderStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

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

// Pointer moves and Escape while dragging happen outside the slider's elements.
export const subscriptions = Subscription.lift({
  volumePointer: Slider.subscriptions.dragPointer,
  volumeEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: (model) => Option.some(model.slider),
  toParentMessage: (message) => Message.GotSliderMessage({ message }),
});

const styles = stylex.create({
  root: { display: "grid", gap: 8, maxInlineSize: 320, paddingBlock: 12 },
  // The thumb sits inside the track; centring the track's cross axis keeps it on the line.
  track: {
    display: "flex",
    alignItems: "center",
    blockSize: 4,
    borderRadius: 2,
    backgroundColor: "gainsboro",
  },
  filledTrack: { borderRadius: 2, backgroundColor: "black" },
  thumb: { inlineSize: 20, blockSize: 20, borderRadius: "50%", backgroundColor: "black" },
  // @foldkit/ui moves the thumb with transform, so press feedback scales it.
  dragging: { scale: 1.2 },
});

const sliderView = SliderStyle.view(Slider.view, {
  root: styles.root,
  track: styles.track,
  filledTrack: styles.filledTrack,
  thumb: (state) => [styles.thumb, state.isDragging && styles.dragging],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "volume",
    model: model.slider,
    view: sliderView,
    viewInputs: {
      value: model.volume,
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
