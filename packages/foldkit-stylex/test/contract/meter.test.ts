import type { HtmlBuilder } from "foldkit/html";

import { Meter } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { MeterStyle } from "../../src/index.ts";
import { classOf, hasStyles } from "../classes.ts";
import { agreesNumbers } from "../numbers.ts";

const styles = stylex.create({
  meter: { display: "block" },
  label: { textDecorationLine: "underline" },
  fill: { backgroundColor: "green" },
});

// The config this test varies; `value` alone checks the defaults.
type Model = Pick<Meter.ViewConfig<never>, "value" | "min" | "max" | "low" | "high" | "optimum">;

// A styled view that records the state its parts get, so each test reads its own.
const recorded = () => {
  const received: Array<MeterStyle.State> = [];

  const meterView = MeterStyle.view(Meter.view, {
    meter: (state) => {
      received.push(state);

      return styles.meter;
    },
    label: styles.label,
    fill: styles.fill,
  });

  const view = (model: Model, h: HtmlBuilder<never>) =>
    meterView(
      {
        ...model,
        id: "storage",
        toView: ({ meter, label, fill }) =>
          h.div(
            [],
            [
              h.span([...label], ["Storage"]),
              h.div([...meter], [h.div([...fill, h.Id("fill")], [])]),
            ],
          ),
      },
      h,
    );

  return { view, state: () => received.at(-1) };
};

const update = (model: Model) => ({ model });

describe("MeterStyle.view", () => {
  // Defaults, a value below and above the range, a max below min, and thresholds of 0, which a
  // truthiness check would drop.
  const scenarios: ReadonlyArray<Model> = [
    { value: 40 },
    { value: -5, min: 0, max: 10 },
    { value: 150 },
    { value: 5, min: 10, max: 2 },
    { value: 40, low: 20, high: 80, optimum: 10 },
    { value: 0, low: 0, high: 0, optimum: 0 },
  ];

  for (const model of scenarios) {
    it(`gives each part the numbers @foldkit/ui sets: ${JSON.stringify(model)}`, () => {
      const { view, state } = recorded();

      Scene.scene(
        { update, view },
        Scene.given(model),
        agreesNumbers("#storage", state, ["value", "min", "max", "low", "high", "optimum"]),
        agreesNumbers("#fill", state, ["value", "min", "max"]),
      );
    });
  }

  it("puts each part's styles on its element and keeps the fill's width", () => {
    const { view } = recorded();

    Scene.scene(
      { update, view },
      Scene.given({ value: 40 }),
      ...hasStyles(Scene.selector("#storage"), styles.meter),
      Scene.expect(Scene.selector("#storage-label")).toHaveClass(classOf(styles.label)),
      ...hasStyles(Scene.selector("#fill"), styles.fill),
      Scene.expect(Scene.selector("#fill")).toHaveStyle("width", "40%"),
    );
  });
});
