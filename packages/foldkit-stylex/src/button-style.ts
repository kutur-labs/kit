import type { Supported } from "./internal/supported.ts";
import type { Button } from "@foldkit/ui";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/** A button's state, as its config sets it. */
export interface State {
  /**
   * Where @foldkit/ui sets `data-disabled` and `aria-disabled`. It drops `onClick` but leaves the
   * element enabled, so a disabled `type: "submit"` button still submits its form.
   */
  readonly isDisabled: boolean;
}

/** Styles for the one part of a Button. */
export interface Styles {
  /**
   * The `<button>` that takes the `button` bundle. Its `type` is `"button"` unless the config sets
   * one, so it submits no form by default.
   */
  readonly button?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Button. `stateOf` and `view` read only
// through these types, and `Supported` checks that the installed @foldkit/ui still has them. They
// take the app's Message, so `view` reads each bundle with its own type.
type Reads<Message = never> = Readonly<{
  Config: Readonly<{ isDisabled?: boolean; toView: (attributes: never) => void }>;
  RenderInfo: Readonly<Record<"button", ReadonlyArray<Attribute<Message>>>>;
}>;

type Has = Readonly<{
  Config: Button.ViewConfig<never>;
  RenderInfo: Button.ButtonAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
});

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Button", Before>;

/**
 * `Button.view` with the button's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    buttonView: Supported<"Button", Has, Reads, typeof Button.view>,
    ...layers: Layers<List>
  ) =>
  <Message>(config: Button.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return buttonView(
      {
        ...config,
        toView: (attributes) => {
          const reads: Reads<Message>["RenderInfo"] = attributes;

          return config.toView({
            ...attributes,
            button: appendClass(
              reads.button,
              part((s) => s.button),
            ),
          });
        },
      },
      h,
    );
  };
