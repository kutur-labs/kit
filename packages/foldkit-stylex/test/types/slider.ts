import type { Html, HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import { SliderStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { Message } from "./message.ts";

const THUMB_SIZE = "1.25rem";

export const volume = (model: Slider.Model, value: number, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: sliderView,
    viewInputs: {
      value,
      ariaLabel: "Volume",
      thumbAlignment: "Edge",
      thumbSize: THUMB_SIZE,
      toView: ({ root, track, filledTrack, thumb }) =>
        h.div([...root], [h.div([...track], [h.div([...filledTrack]), h.div([...thumb])])]),
    },
    toParentMessage: (message) => Message.GotVolumeMessage({ message }),
  });

const styles = stylex.create({
  root: { paddingBlock: 12 },
  // The thumb sits inside the track, which @foldkit/ui positions; flex centres it on the line.
  track: {
    display: "flex",
    alignItems: "center",
    blockSize: 4,
    borderRadius: 2,
    backgroundColor: "gainsboro",
  },
  fill: { borderRadius: 2, backgroundColor: "black" },
  thumb: {
    inlineSize: THUMB_SIZE,
    blockSize: THUMB_SIZE,
    borderRadius: "50%",
    backgroundColor: "white",
    boxShadow: "0 1px 3px rgb(0 0 0 / 0.4)",
    transitionProperty: "scale",
    transitionDuration: "100ms",
  },
  dragging: { scale: 1.2 },
});

const sliderView = SliderStyle.view(Slider.view, {
  root: styles.root,
  track: styles.track,
  filledTrack: styles.fill,
  thumb: (state) => [styles.thumb, state.isDragging && styles.dragging],
});
