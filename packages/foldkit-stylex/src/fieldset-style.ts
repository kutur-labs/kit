import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Fieldset } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/**
 * A fieldset's state, as its config sets it; the same for each part. @foldkit/ui sets the hook on
 * the fieldset.
 */
export interface State {
  /**
   * Where @foldkit/ui sets the native `disabled` attribute and `data-disabled`. The browser then
   * disables native controls inside, but not their components' flags: pass `isDisabled` to each.
   */
  readonly isDisabled: boolean;
}

/** Styles for each part of a Fieldset. */
export interface Styles {
  /** The `<fieldset>` element. */
  readonly fieldset?: PartStyle<State>;
  /** The `<legend>` that names the fieldset. */
  readonly legend?: PartStyle<State>;
  /** The element that describes the fieldset; @foldkit/ui links it when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Fieldset. `stateOf` reads only these, and
// `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  Config: Readonly<{ isDisabled?: boolean }>;
  RenderInfo: Readonly<Record<"fieldset" | "legend" | "description", ReadonlyArray<unknown>>>;
}>;

type Has = Readonly<{
  Config: Fieldset.ViewConfig<never>;
  RenderInfo: Fieldset.FieldsetAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
});

/**
 * `Fieldset.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    fieldsetView: Supported<"Fieldset", Has, Reads, typeof Fieldset.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Message>(config: Fieldset.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return fieldsetView(
      {
        ...config,
        toView: (attributes) =>
          config.toView({
            ...attributes,
            fieldset: appendClass(
              attributes.fieldset,
              part((s) => s.fieldset),
            ),
            legend: appendClass(
              attributes.legend,
              part((s) => s.legend),
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
