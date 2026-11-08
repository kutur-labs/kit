import type { Filled, ItemState, Reads, Styles } from "./internal/combobox.ts";
import type { Callbacks, Has } from "./internal/items.ts";
import type { Layers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Combobox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { styledInputs } from "./internal/combobox.ts";

export type { ItemState, State, Styles } from "./internal/combobox.ts";

export * as Multi from "./combobox-multi-style.ts";

/** `Combobox.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs<Item extends string> = Combobox.ViewInputs<Item> &
  Callbacks<Item, ItemState> &
  Filled;

/**
 * A `Combobox.create` view with each part's styles; pass it to `h.submodel` as `view`. Pass several
 * styles objects to layer them: later ones win property by property.
 */
export const view = <Item extends string, const List extends ReadonlyArray<Styles>>(
  comboboxView: Supported<
    "Combobox",
    Has<Combobox.Model, Combobox.ViewInputs<string>>,
    Reads,
    (
      model: Combobox.Model,
      inputs: Combobox.ViewInputs<Item>,
      h: HtmlBuilder<Combobox.Message>,
    ) => Html
  >,
  ...layers: Layers<List, Styles, "Combobox">
): View<Combobox.Model, Combobox.Message, ViewInputs<Item>> =>
  defineView<Combobox.Model, Combobox.Message, ViewInputs<Item>>((model, inputs, h) =>
    comboboxView(model, { ...inputs, ...styledInputs(layers, model, inputs) }, h),
  );
