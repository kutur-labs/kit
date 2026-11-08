import type { Supported } from "./internal/supported.ts";
import type { Select } from "@foldkit/ui";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/**
 * A select's state, as its config sets it; the same for each part. @foldkit/ui sets each hook on
 * the select.
 */
export interface State {
  /** Where @foldkit/ui sets native `disabled` and `data-disabled`; it sets no `aria-disabled`. */
  readonly isDisabled: boolean;
  /** Where @foldkit/ui sets `aria-invalid` and `data-invalid`. */
  readonly isInvalid: boolean;
}

/** Styles for each part of a Select. */
export interface Styles {
  /** The `<select>` element; its `<option>` children are the app's own. */
  readonly select?: PartStyle<State>;
  /** The `<label>` that names the select. */
  readonly label?: PartStyle<State>;
  /** The element that describes the select; @foldkit/ui links it when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Select. `stateOf` and `view` read only
// through these types, and `Supported` checks that the installed @foldkit/ui still has them. They
// take the app's Message, so `view` reads each bundle with its own type.
type Reads<Message = never> = Readonly<{
  Config: Readonly<{
    isDisabled?: boolean;
    isInvalid?: boolean;
    toView: (attributes: never) => void;
  }>;
  RenderInfo: Readonly<
    Record<"select" | "label" | "description", ReadonlyArray<Attribute<Message>>>
  >;
}>;

type Has = Readonly<{
  Config: Select.ViewConfig<never>;
  RenderInfo: Select.SelectAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
  isInvalid: config.isInvalid ?? false,
});

/**
 * `Select.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    selectView: Supported<"Select", Has, Reads, typeof Select.view>,
    ...layers: Layers<List, Styles, "Select">
  ) =>
  <Message>(config: Select.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return selectView(
      {
        ...config,
        toView: (attributes) => {
          const reads: Reads<Message>["RenderInfo"] = attributes;

          return config.toView({
            ...attributes,
            select: appendClass(
              reads.select,
              part((s) => s.select),
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
