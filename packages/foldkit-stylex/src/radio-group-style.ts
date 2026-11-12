import type { Supported } from "./internal/supported.ts";
import type { RadioGroup } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { appendChildClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/** The group's state, from its view inputs. */
export interface State {
  /** Sets `aria-orientation` on the group and which arrow keys move between options. */
  readonly orientation: RadioGroup.Orientation;
  /** The group's `isDisabled` input. @foldkit/ui marks each option with `data-disabled`, not the group. */
  readonly isDisabled: boolean;
  /** Where @foldkit/ui sets `data-readonly` on the group and on each option. */
  readonly isReadOnly: boolean;
}

/**
 * An option's state, and its label's and description's. Style keyboard focus with
 * `':focus-visible'`; the roving tab stop has no flag.
 */
export interface OptionState extends State {
  /** The option holds the selected value, where @foldkit/ui sets `data-checked`. */
  readonly isSelected: boolean;
  /** The group or this option is disabled, where @foldkit/ui sets `data-disabled` on the option. */
  readonly isDisabled: boolean;
  /** The option's position in `options`, from 0. */
  readonly index: number;
}

/** Styles for each part of a RadioGroup. */
export interface Styles {
  /** The element around the options, with `role="radiogroup"`. */
  readonly group?: PartStyle<State>;
  /** The element that takes clicks and keys; draw the radio mark inside it with `sx(...)`. */
  readonly option?: PartStyle<OptionState>;
  /**
   * The label that names its option through `aria-labelledby`. It has no click handler: a click on
   * it selects the option only when it sits inside `option`.
   */
  readonly label?: PartStyle<OptionState>;
  /** Text that describes its option, linked only where `hasOptionDescription` returns true. */
  readonly description?: PartStyle<OptionState>;
}

// Everything this module reads from @foldkit/ui's RadioGroup. `stateOf`, `styledOption` and `view`
// read only through these types, and `Supported` checks that the installed @foldkit/ui still has
// them. Orientations are spelled out, so a renamed one fails `Supported` too.
type Reads = Readonly<{
  RenderInfo: Readonly<{
    group: ReadonlyArray<ChildAttribute>;
    options: ReadonlyArray<
      Readonly<Record<"option" | "label" | "description", ReadonlyArray<ChildAttribute>>> &
        Readonly<{ isSelected: boolean; isDisabled: boolean; isReadOnly: boolean; index: number }>
    >;
  }>;
  ViewInputs: Readonly<{
    orientation?: "Horizontal" | "Vertical";
    isDisabled?: boolean;
    isReadOnly?: boolean;
    toView: (render: never) => void;
  }>;
}>;

type Has = Readonly<{ RenderInfo: RadioGroup.RenderInfo; ViewInputs: RadioGroup.ViewInputs }>;

const stateOf = (inputs: Reads["ViewInputs"]): State => ({
  orientation: inputs.orientation ?? "Vertical",
  isDisabled: inputs.isDisabled ?? false,
  isReadOnly: inputs.isReadOnly ?? false,
});

// An option's, its label's and its description's bundles, with their styles.
const styledOption = (
  layers: ReadonlyArray<Styles>,
  state: State,
  reads: Reads["RenderInfo"]["options"][number],
) => {
  const part = partsOf(layers, {
    ...state,
    isSelected: reads.isSelected,
    isDisabled: reads.isDisabled,
    isReadOnly: reads.isReadOnly,
    index: reads.index,
  } satisfies OptionState);

  return {
    option: appendChildClass(
      reads.option,
      part((s) => s.option),
    ),
    label: appendChildClass(
      reads.label,
      part((s) => s.label),
    ),
    description: appendChildClass(
      reads.description,
      part((s) => s.description),
    ),
  };
};

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "RadioGroup", Before>;

/** A `RadioGroup.create` view with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <Value extends string, const List extends ReadonlyArray<Styles>>(
  radioGroupView: Supported<
    "RadioGroup",
    Has,
    Reads,
    View<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>>
  >,
  ...layers: Layers<List>
): View<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>> =>
  defineView<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>>(
    (model, inputs, h) =>
      radioGroupView(
        model,
        {
          ...inputs,
          toView: (render) => {
            const reads: Reads["RenderInfo"] = render;
            const state = stateOf(inputs);

            return inputs.toView({
              ...render,
              group: appendChildClass(
                reads.group,
                partsOf(layers, state)((s) => s.group),
              ),
              options: render.options.map((info) => ({
                ...info,
                ...styledOption(layers, state, info),
              })),
            });
          },
        },
        h,
      ),
  );
