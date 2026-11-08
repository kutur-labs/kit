import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { RadioGroup } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

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

// Everything this module reads from @foldkit/ui's RadioGroup. The state is built from these only,
// and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<{
    group: ReadonlyArray<ChildAttribute>;
    options: ReadonlyArray<
      Readonly<Record<"option" | "label" | "description", ReadonlyArray<ChildAttribute>>> &
        Readonly<{ isSelected: boolean; isDisabled: boolean; isReadOnly: boolean; index: number }>
    >;
  }>;
  ViewInputs: Readonly<{
    orientation?: RadioGroup.Orientation;
    isDisabled?: boolean;
    isReadOnly?: boolean;
  }>;
}>;

type Has = Readonly<{ RenderInfo: RadioGroup.RenderInfo; ViewInputs: RadioGroup.ViewInputs }>;

/** A `RadioGroup.create` view with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <Value extends string, const List extends ReadonlyArray<Styles>>(
  radioGroupView: Supported<
    "RadioGroup",
    Has,
    Reads,
    View<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>>
  >,
  ...layers: Layers<List, Own.None>
): View<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>> =>
  defineView<RadioGroup.Model, RadioGroup.Message, RadioGroup.ViewInputs<Value>>(
    (model, inputs, h) =>
      radioGroupView(
        model,
        {
          ...inputs,
          toView: (render) => {
            const state: State = {
              orientation: inputs.orientation ?? "Vertical",
              isDisabled: inputs.isDisabled ?? false,
              isReadOnly: inputs.isReadOnly ?? false,
            };

            return inputs.toView({
              ...render,
              group: appendChildClass(
                render.group,
                partsOf(layers, state)((s) => s.group),
              ),
              options: render.options.map((info) => {
                const part = partsOf(layers, {
                  ...state,
                  isSelected: info.isSelected,
                  isDisabled: info.isDisabled,
                  isReadOnly: info.isReadOnly,
                  index: info.index,
                } satisfies OptionState);

                return {
                  ...info,
                  option: appendChildClass(
                    info.option,
                    part((s) => s.option),
                  ),
                  label: appendChildClass(
                    info.label,
                    part((s) => s.label),
                  ),
                  description: appendChildClass(
                    info.description,
                    part((s) => s.description),
                  ),
                };
              }),
            });
          },
        },
        h,
      ),
  );
