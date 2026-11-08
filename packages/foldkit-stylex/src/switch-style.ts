import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Switch } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A switch's state, as its config sets it; the same for each part. */
export interface State {
  /** Where @foldkit/ui sets `data-checked`. */
  readonly isChecked: boolean;
  /** Where @foldkit/ui sets `data-disabled`. The switch stays focusable and stops toggling. */
  readonly isDisabled: boolean;
  /** Where @foldkit/ui sets `data-readonly`. The switch stays focusable and stops toggling. */
  readonly isReadOnly: boolean;
}

/** Styles for each part of a Switch. Render the thumb inside `button` with `sx(...)`. */
export interface Styles {
  /** The element with the switch role, which carries `data-checked` and the other hooks. */
  readonly button?: PartStyle<State>;
  /** The label that names the switch through `aria-labelledby`; clicking it toggles the switch. */
  readonly label?: PartStyle<State>;
  /** Text that describes the switch; @foldkit/ui links it only when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
  readonly thumb?: "Switch renders no thumb part: draw it inside the button with sx(...)";
}

// Everything this module reads from @foldkit/ui's Switch. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{
    isChecked: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
  }>;
  RenderInfo: Readonly<Record<"button" | "label" | "description", ReadonlyArray<unknown>>>;
}>;

type Has = Readonly<{
  Config: Switch.ViewConfig<never>;
  RenderInfo: Switch.SwitchAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isChecked: config.isChecked,
  isDisabled: config.isDisabled ?? false,
  isReadOnly: config.isReadOnly ?? false,
});

/**
 * `Switch.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    switchView: Supported<"Switch", Has, Reads, typeof Switch.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Switch.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return switchView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            button: appendClass(
              attributes.button,
              part((s) => s.button),
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
