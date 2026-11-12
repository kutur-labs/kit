import type { Callbacks, Has } from "./internal/items.ts";
import type { Filled, ItemState, Reads, Styles } from "./internal/listbox.ts";
import type { CheckedLayers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Listbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { styledInputs } from "./internal/listbox.ts";

export type { ItemState, State, Styles } from "./internal/listbox.ts";

export * as Multi from "./listbox-multi-style.ts";

/** `Listbox.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs<Item, Value extends string> = Listbox.ViewInputs<Item, Value> &
  Callbacks<Item, ItemState> &
  Filled;

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Listbox", Before>;

/**
 * A `Listbox.create` view with each part's styles; pass it to `h.submodel` as `view`. Pass several
 * styles objects to layer them: later ones win property by property.
 */
export const view = <Item, Value extends string, const List extends ReadonlyArray<Styles>>(
  listboxView: Supported<
    "Listbox",
    Has<Listbox.Model, Listbox.ViewInputs<unknown>>,
    Reads,
    (
      model: Listbox.Model,
      inputs: Listbox.ViewInputs<Item, Value>,
      h: HtmlBuilder<Listbox.Message>,
    ) => Html
  >,
  ...layers: Layers<List>
): View<Listbox.Model, Listbox.Message, ViewInputs<Item, Value>> =>
  defineView<Listbox.Model, Listbox.Message, ViewInputs<Item, Value>>((model, inputs, h) =>
    listboxView(model, { ...inputs, ...styledInputs(layers, model, inputs) }, h),
  );
