import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Button } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

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

// Everything this module reads from @foldkit/ui's Button. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ isDisabled?: boolean }>;
  RenderInfo: Readonly<Record<"button", ReadonlyArray<unknown>>>;
}>;

type Has = Readonly<{
  Config: Button.ViewConfig<never>;
  RenderInfo: Button.ButtonAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
});

/**
 * `Button.view` with the button's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    buttonView: Supported<"Button", Has, Reads, typeof Button.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Button.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return buttonView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            button: appendClass(
              attributes.button,
              part((s) => s.button),
            ),
          }),
      },
      h,
    );
  };
