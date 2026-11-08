import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Progress } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import * as Predicate from "effect/Predicate";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";
import { boundsOf, clamp } from "./internal/range.ts";

/** A progress indicator's state as @foldkit/ui renders it, the same for each part. */
export interface State {
  /** The config has no value, where @foldkit/ui sets `data-indeterminate` on every part but `label`. */
  readonly isIndeterminate: boolean;
  /** The value reached `max`, where @foldkit/ui sets `data-state="complete"`. */
  readonly isComplete: boolean;
  /** The value held between `min` and `max`, which @foldkit/ui sets as `data-value`; `undefined` while indeterminate. */
  readonly value: number | undefined;
  /** The config's `min`, or 0; @foldkit/ui sets it as `data-min` while determinate. */
  readonly min: number;
  /** The config's `max`, or 100, and never less than `min`; `data-max` while determinate. */
  readonly max: number;
}

/** Styles for each part of Progress. */
export interface Styles {
  /** The element with `role="progressbar"`; it has `aria-valuenow` only while determinate. */
  readonly progress?: PartStyle<State>;
  /** The label that names the progress bar unless `ariaLabel` or `ariaLabelledBy` is set. */
  readonly label?: PartStyle<State>;
  /** The element that draws the full range, around `indicator`. */
  readonly track?: PartStyle<State>;
  /**
   * @foldkit/ui sets its width from the value, and none while indeterminate: size it then with
   * `minInlineSize` under `isIndeterminate`.
   */
  readonly indicator?: PartStyle<State>;
}

type Owns = Readonly<{ indicator: Own.ValueFill }>;

// Everything this module reads from @foldkit/ui's Progress. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ value?: number; min?: number; max?: number }>;
  RenderInfo: Readonly<
    Record<"progress" | "label" | "track" | "indicator", ReadonlyArray<unknown>>
  >;
}>;

type Has = Readonly<{
  Config: Progress.ViewConfig<never>;
  RenderInfo: Progress.ProgressAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => {
  const bounds = boundsOf(config);
  const value = Predicate.isUndefined(config.value) ? undefined : clamp(config.value, bounds);

  return {
    ...bounds,
    value,
    isIndeterminate: Predicate.isUndefined(value),
    isComplete: Predicate.isNotUndefined(value) && value >= bounds.max,
  };
};

/**
 * `Progress.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    progressView: Supported<"Progress", Has, Reads, typeof Progress.view>,
    ...layers: Layers<List, Owns>
  ) =>
  <Message>(config: Progress.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return progressView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            progress: appendClass(
              attributes.progress,
              part((s) => s.progress),
            ),
            label: appendClass(
              attributes.label,
              part((s) => s.label),
            ),
            track: appendClass(
              attributes.track,
              part((s) => s.track),
            ),
            indicator: appendClass(
              attributes.indicator,
              part((s) => s.indicator),
            ),
          }),
      },
      h,
    );
  };
