import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Input } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/**
 * An input's state, as its config sets it; the same for each part. @foldkit/ui sets each hook on
 * the input.
 */
export interface State {
  /** Where @foldkit/ui sets native `disabled` and `data-disabled`; it sets no `aria-disabled`. */
  readonly isDisabled: boolean;
  /** Where @foldkit/ui sets the native `readonly` attribute and `data-readonly`. */
  readonly isReadOnly: boolean;
  /** Where @foldkit/ui sets `aria-invalid` and `data-invalid`. */
  readonly isInvalid: boolean;
}

/** Styles for each part of an Input. */
export interface Styles {
  /** The `<input>` element. */
  readonly input?: PartStyle<State>;
  /** The `<label>` that names the input. */
  readonly label?: PartStyle<State>;
  /** The element that describes the input; @foldkit/ui links it when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Input. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ isDisabled?: boolean; isReadOnly?: boolean; isInvalid?: boolean }>;
  RenderInfo: Readonly<Record<"input" | "label" | "description", ReadonlyArray<unknown>>>;
}>;

type Has = Readonly<{
  Config: Input.ViewConfig<never>;
  RenderInfo: Input.InputAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
  isReadOnly: config.isReadOnly ?? false,
  isInvalid: config.isInvalid ?? false,
});

/**
 * `Input.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    inputView: Supported<"Input", Has, Reads, typeof Input.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Input.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return inputView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            input: appendClass(
              attributes.input,
              part((s) => s.input),
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
