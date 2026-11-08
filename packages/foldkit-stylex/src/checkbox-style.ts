import type { Supported } from "./internal/supported.ts";
import type { Checkbox } from "@foldkit/ui";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A checkbox's state, as its config sets it; the same for each part. */
export interface State {
  /** Checked and not indeterminate, where @foldkit/ui sets `data-checked`. */
  readonly isChecked: boolean;
  /** Where @foldkit/ui sets `data-indeterminate`, whether or not `isChecked` is set in the config. */
  readonly isIndeterminate: boolean;
  /** The `isDisabled` config; @foldkit/ui sets `aria-disabled` and `data-disabled`, not `disabled`. */
  readonly isDisabled: boolean;
  /** The `isReadOnly` config; @foldkit/ui sets `aria-readonly` and `data-readonly`. */
  readonly isReadOnly: boolean;
}

/** Styles for each part of a Checkbox. Render the tick inside `checkbox` with `sx(...)`. */
export interface Styles {
  /** The `<button>` that takes the `checkbox` bundle, with `role="checkbox"`; it toggles on click. */
  readonly checkbox?: PartStyle<State>;
  /** The label that names the checkbox through `aria-labelledby`. */
  readonly label?: PartStyle<State>;
  /** Text that describes the checkbox; @foldkit/ui links it only when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Checkbox. `stateOf` and `view` read only
// through these types, and `Supported` checks that the installed @foldkit/ui still has them. They
// take the app's Message, so `view` reads each bundle with its own type.
type Reads<Message = never> = Readonly<{
  Config: Readonly<{
    isChecked: boolean;
    isIndeterminate?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    toView: (attributes: never) => void;
  }>;
  RenderInfo: Readonly<
    Record<"checkbox" | "label" | "description", ReadonlyArray<Attribute<Message>>>
  >;
}>;

type Has = Readonly<{
  Config: Checkbox.ViewConfig<never>;
  RenderInfo: Checkbox.CheckboxAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isChecked: config.isChecked && config.isIndeterminate !== true,
  isIndeterminate: config.isIndeterminate ?? false,
  isDisabled: config.isDisabled ?? false,
  isReadOnly: config.isReadOnly ?? false,
});

/**
 * `Checkbox.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    checkboxView: Supported<"Checkbox", Has, Reads, typeof Checkbox.view>,
    ...layers: Layers<List, Styles, "Checkbox">
  ) =>
  <Message>(config: Checkbox.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return checkboxView(
      {
        ...config,
        toView: (attributes) => {
          const reads: Reads<Message>["RenderInfo"] = attributes;

          return config.toView({
            ...attributes,
            checkbox: appendClass(
              reads.checkbox,
              part((s) => s.checkbox),
            ),
            label: appendClass(
              reads.label,
              part((s) => s.label),
            ),
            description: appendClass(
              reads.description,
              part((s) => s.description),
            ),
          });
        },
      },
      h,
    );
  };
