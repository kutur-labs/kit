import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Disclosure } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** A disclosure's state, as its config sets it; the same for each part. */
export interface State {
  /** Where @foldkit/ui sets `data-open` on the button and the panel. */
  readonly isOpen: boolean;
  /** Where @foldkit/ui sets `data-disabled` on the button, which stays focusable and stops toggling. */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Disclosure. Render a chevron inside `button` with `sx(...)`. */
export interface Styles {
  /** The `<button>` that takes the `button` bundle; click, Enter and Space toggle the panel. */
  readonly button?: PartStyle<State>;
  /**
   * The element you spread the `panel` bundle onto. Inside `animatePanel` it sits in two wrappers
   * with no hook: they animate the height for 200 ms and clip overflow, so the panel's shadow and
   * outline do not show past its box. Leave `animatePanel` out to animate the panel yourself.
   */
  readonly panel?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Disclosure. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ isOpen: boolean; isDisabled?: boolean }>;
  RenderInfo: Readonly<Record<"button" | "panel", ReadonlyArray<unknown>>>;
}>;

type Has = Readonly<{
  Config: Disclosure.ViewConfig<never>;
  RenderInfo: Disclosure.DisclosureAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isOpen: config.isOpen,
  isDisabled: config.isDisabled ?? false,
});

/**
 * `Disclosure.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    disclosureView: Supported<"Disclosure", Has, Reads, typeof Disclosure.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Disclosure.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return disclosureView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            button: appendClass(
              attributes.button,
              part((s) => s.button),
            ),
            panel: appendClass(
              attributes.panel,
              part((s) => s.panel),
            ),
          }),
      },
      h,
    );
  };
