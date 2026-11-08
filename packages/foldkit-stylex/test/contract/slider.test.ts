import type { HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { SliderStyle } from "../../src/index.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isDragging: { scale: 1.2 },
  isDisabled: { opacity: 0.5 },
  isReadOnly: { cursor: "default" },
  isHorizontal: { flexDirection: "row" },
  root: { paddingBlock: 12 },
  label: { fontWeight: 700 },
  track: { blockSize: 4 },
  filledTrack: { backgroundColor: "black" },
});

const sliderView = SliderStyle.view(Slider.view, {
  root: [styles.root],
  label: styles.label,
  track: (state) => [styles.track, state.orientation === "Horizontal" && styles.isHorizontal],
  filledTrack: styles.filledTrack,
  thumb: (state) => [
    state.isDragging && styles.isDragging,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
  ],
});

// The optional inputs this test varies, left out where it checks their defaults.
type Model = Readonly<{
  slider: Slider.Model;
  value: number;
  inputs: Pick<Slider.ViewInputs, "isDisabled" | "isReadOnly" | "orientation">;
}>;

const view = (model: Model, h: HtmlBuilder<Slider.Message>) =>
  sliderView(
    model.slider,
    {
      ...model.inputs,
      value: model.value,
      toView: ({ root, label, track, filledTrack, thumb }) =>
        h.div(
          [...root],
          [
            h.span([...label], ["Volume"]),
            h.div([...track], [h.div([...filledTrack]), h.div([...thumb])]),
          ],
        ),
    },
    h,
  );

const update = (model: Model, message: Slider.Message) => {
  const next = Slider.update(model.slider, message);

  return {
    model: { ...model, slider: next.model, value: next.outMessage?.value ?? model.value },
  };
};

const idle = Slider.init({ id: "volume", min: 0, max: 100, step: 1 });

const unset: Model = { slider: idle, value: 50, inputs: {} };

const thumb = Scene.selector("#volume-thumb");

const track = Scene.selector("[data-slider-track-id]");

describe("SliderStyle.view", () => {
  const dragging = Slider.update(idle, Slider.Message.PressedThumb({ originValue: 50 })).model;

  for (const [name, model, flags] of [
    ["idle", unset, { isDragging: false, isDisabled: false, isReadOnly: false }],
    [
      "dragging",
      { ...unset, slider: dragging },
      { isDragging: true, isDisabled: false, isReadOnly: false },
    ],
    [
      "disabled",
      { ...unset, inputs: { isDisabled: true } },
      { isDragging: false, isDisabled: true, isReadOnly: false },
    ],
    [
      "read-only",
      { ...unset, inputs: { isReadOnly: true } },
      { isDragging: false, isDisabled: false, isReadOnly: true },
    ],
  ] as const) {
    it(`sets each flag on the thumb where @foldkit/ui sets its hook: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(thumb, "data-dragging", styles.isDragging, flags.isDragging),
        ...agrees(thumb, "data-disabled", styles.isDisabled, flags.isDisabled),
        ...agrees(thumb, "data-readonly", styles.isReadOnly, flags.isReadOnly),
      );
    });
  }

  for (const [inputs, isHorizontal] of [
    [{}, true],
    [{ orientation: "Horizontal" }, true],
    [{ orientation: "Vertical" }, false],
  ] as const) {
    it(`sets orientation where @foldkit/ui sets its data attribute: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ ...unset, inputs }),
        ...agrees(track, "data-horizontal", styles.isHorizontal, isHorizontal),
      );
    });
  }

  it("puts each part's styles beside @foldkit/ui's inline position", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      ...hasStyles(Scene.selector("[data-slider-id]"), styles.root),
      ...hasStyles(Scene.selector("#volume-label"), styles.label),
      ...hasStyles(track, styles.track),
      Scene.expect(
        Scene.selector(`[data-slider-track-id] .${classOf(styles.filledTrack)}`),
      ).toExist(),
      Scene.expect(track).toHaveStyle("position", "relative"),
    );
  });

  it("still steps the value from a key on the thumb", () => {
    Scene.scene(
      { update, view },
      Scene.given(unset),
      Scene.keydown(thumb, "ArrowRight"),
      Scene.expect(thumb).toHaveAttr("aria-valuenow", "51"),
    );
  });
});
