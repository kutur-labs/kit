import type { HtmlBuilder } from "foldkit/html";

import { Progress } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { ProgressStyle } from "../../src/index.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";
import { agreesNumbers } from "../numbers.ts";

const styles = stylex.create({
  isIndeterminate: { opacity: 0.5 },
  isComplete: { color: "green" },
  label: { textDecorationLine: "underline" },
  track: { blockSize: 8 },
  indicator: { backgroundColor: "black" },
});

// The config this test varies; an empty config checks the defaults and the indeterminate state.
type Model = Pick<Progress.ViewConfig<never>, "value" | "min" | "max">;

// A styled view that records the state its parts get, so each test reads its own.
const recorded = () => {
  const received: Array<ProgressStyle.State> = [];

  const flags = (state: ProgressStyle.State) => [
    state.isIndeterminate && styles.isIndeterminate,
    state.isComplete && styles.isComplete,
  ];

  const progressView = ProgressStyle.view(Progress.view, {
    progress: (state) => {
      received.push(state);

      return flags(state);
    },
    label: styles.label,
    track: (state) => [styles.track, flags(state)],
    indicator: (state) => [styles.indicator, flags(state)],
  });

  const view = (model: Model, h: HtmlBuilder<never>) =>
    progressView(
      {
        ...model,
        id: "upload",
        toView: ({ progress, label, track, indicator }) =>
          h.div(
            [],
            [
              h.span([...label], ["Upload"]),
              h.div(
                [...progress],
                [h.div([...track, h.Id("track")], [h.div([...indicator, h.Id("indicator")], [])])],
              ),
            ],
          ),
      },
      h,
    );

  return { view, state: () => received.at(-1) };
};

const update = (model: Model) => ({ model });

const parts = ["#upload", "#track", "#indicator"];

describe("ProgressStyle.view", () => {
  // No value, a value below, inside, at and above the range, and a max below min, which clamps
  // the value up to a complete min.
  const scenarios: ReadonlyArray<readonly [Model, boolean]> = [
    [{}, false],
    [{ value: -5 }, false],
    [{ value: 40 }, false],
    [{ value: 100 }, true],
    [{ value: 150, min: 0, max: 120 }, true],
    [{ value: 5, min: 10, max: 2 }, true],
  ];

  for (const [model, isComplete] of scenarios) {
    it(`sets each flag and number where @foldkit/ui sets its hook: ${JSON.stringify(model)}`, () => {
      const { view, state } = recorded();
      const isIndeterminate = model.value === undefined;
      // @foldkit/ui sets data-min and data-max only while determinate.
      const numbers = isIndeterminate ? (["value"] as const) : (["value", "min", "max"] as const);

      Scene.scene(
        { update, view },
        Scene.given(model),
        ...parts.flatMap((part) => [
          ...agrees(
            Scene.selector(part),
            "data-indeterminate",
            styles.isIndeterminate,
            isIndeterminate,
          ),
          ...(isComplete
            ? [
                Scene.expect(Scene.selector(part)).toHaveAttr("data-state", "complete"),
                Scene.expect(Scene.selector(part)).toHaveClass(classOf(styles.isComplete)),
              ]
            : [
                Scene.expect(Scene.selector(part)).not.toHaveAttr("data-state", "complete"),
                Scene.expect(Scene.selector(part)).not.toHaveClass(classOf(styles.isComplete)),
              ]),
        ]),
        agreesNumbers("#upload", state, numbers),
        agreesNumbers("#indicator", state, numbers),
      );
    });
  }

  it("puts each part's styles on its element and keeps the indicator's width", () => {
    const { view } = recorded();

    Scene.scene(
      { update, view },
      Scene.given({ value: 40 }),
      Scene.expect(Scene.selector("#upload-label")).toHaveClass(classOf(styles.label)),
      ...hasStyles(Scene.selector("#track"), styles.track),
      ...hasStyles(Scene.selector("#indicator"), styles.indicator),
      Scene.expect(Scene.selector("#indicator")).toHaveStyle("width", "40%"),
    );
  });
});
