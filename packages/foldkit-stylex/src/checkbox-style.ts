import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Checkbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A checkbox's state, as its config sets it; the same for each part. */
export interface State {
  /** Checked and not indeterminate, where @foldkit/ui sets `data-checked`. */
  readonly isChecked: boolean;
  /** Where @foldkit/ui sets `data-indeterminate`, whether or not `isChecked` is set in the config. */
  readonly isIndeterminate: boolean;
  readonly isDisabled: boolean;
  readonly isReadOnly: boolean;
}

/** Styles for each part of a Checkbox. Render the tick inside `checkbox` with `sx(...)`. */
export interface Styles {
  readonly checkbox?: PartStyle<State>;
  readonly label?: PartStyle<State>;
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Checkbox. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{
    isChecked: boolean;
    isIndeterminate?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
  }>;
  RenderInfo: Readonly<Record<"checkbox" | "label" | "description", ReadonlyArray<unknown>>>;
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
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Checkbox.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return checkboxView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            checkbox: appendClass(
              attributes.checkbox,
              part((s) => s.checkbox),
            ),
            label: appendClass(
              attributes.label,
              part((s) => s.label),
            ),
            description: appendClass(
              attributes.description,
              part((s) => s.description),
            ),
          }),
      },
      h,
    );
  };
