import type { Supported } from "./internal/supported.ts";
import type { Meter } from "@foldkit/ui";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";
import { boundsOf, clamp } from "./internal/range.ts";

/**
 * A meter's numbers as @foldkit/ui renders them, the same for each part. @foldkit/ui derives no
 * region from the thresholds, so compare `value` with them: `state.value >= (state.high ?? Infinity)`.
 */
export interface State {
  /** The value held between `min` and `max`, which @foldkit/ui sets as `data-value`. */
  readonly value: number;
  /** `data-min`: the config's `min`, or 0. */
  readonly min: number;
  /** `data-max`: the config's `max`, or 100, and never less than `min`. */
  readonly max: number;
  /** `data-low` on the meter, as the config sets it; `undefined` when the config leaves it out. */
  readonly low: number | undefined;
  /** `data-high` on the meter, as the config sets it; `undefined` when the config leaves it out. */
  readonly high: number | undefined;
  /** `data-optimum` on the meter, as the config sets it; `undefined` when the config leaves it out. */
  readonly optimum: number | undefined;
}

/** Styles for each part of a Meter. Put `fill` inside an element that draws the track. */
export interface Styles {
  /**
   * The element with `role="meter"` and the `aria-value*` attributes. The threshold hooks are on it
   * alone; `fill` repeats only `data-value`, `data-min` and `data-max`.
   */
  readonly meter?: PartStyle<State>;
  /** The label that names the meter unless `ariaLabel` or `ariaLabelledBy` is set. */
  readonly label?: PartStyle<State>;
  /** @foldkit/ui sets its width from the value; style its height and color. */
  readonly fill?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Meter. `stateOf` and `view` read only
// through these types, and `Supported` checks that the installed @foldkit/ui still has them. They
// take the app's Message, so `view` reads each bundle with its own type.
type Reads<Message = never> = Readonly<{
  Config: Readonly<{
    value: number;
    min?: number;
    max?: number;
    low?: number;
    high?: number;
    optimum?: number;
    toView: (attributes: never) => void;
  }>;
  RenderInfo: Readonly<Record<"meter" | "label" | "fill", ReadonlyArray<Attribute<Message>>>>;
}>;

type Has = Readonly<{
  Config: Meter.ViewConfig<never>;
  RenderInfo: Meter.MeterAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => {
  const bounds = boundsOf(config);

  return {
    ...bounds,
    value: clamp(config.value, bounds),
    low: config.low,
    high: config.high,
    optimum: config.optimum,
  };
};

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Meter", Before>;

/**
 * `Meter.view` with each part's styles on the attributes `toView` gets. Pass several styles objects
 * to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    meterView: Supported<"Meter", Has, Reads, typeof Meter.view>,
    ...layers: Layers<List>
  ) =>
  <Message>(config: Meter.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return meterView(
      {
        ...config,
        toView: (attributes) => {
          const reads: Reads<Message>["RenderInfo"] = attributes;

          return config.toView({
            ...attributes,
            meter: appendClass(
              reads.meter,
              part((s) => s.meter),
            ),
            label: appendClass(
              reads.label,
              part((s) => s.label),
            ),
            fill: appendClass(
              reads.fill,
              part((s) => s.fill),
            ),
          });
        },
      },
      h,
    );
  };
