import type { Filled, ItemState, Reads, Styles } from "./internal/combobox.ts";
import type { Callbacks, Has } from "./internal/items.ts";
import type { CheckedLayers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Combobox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { styledInputs } from "./internal/combobox.ts";

/** `Combobox.Multi.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs<Item extends string> = Combobox.Multi.ViewInputs<Item> &
  Callbacks<Item, ItemState> &
  Filled;

/** A `Combobox.Multi.create` view with each part's styles; it takes the same styles as `ComboboxStyle.view`. */
export const view = <Item extends string, const List extends ReadonlyArray<Styles>>(
  comboboxView: Supported<
    "Combobox.Multi",
    Has<Combobox.Multi.Model, Combobox.Multi.ViewInputs<string>>,
    Reads,
    (
      model: Combobox.Multi.Model,
      inputs: Combobox.Multi.ViewInputs<Item>,
      h: HtmlBuilder<Combobox.Message>,
    ) => Html
  >,
  ...layers: CheckedLayers<List, Styles, "Combobox">
): View<Combobox.Multi.Model, Combobox.Message, ViewInputs<Item>> =>
  defineView<Combobox.Multi.Model, Combobox.Message, ViewInputs<Item>>((model, inputs, h) =>
    comboboxView(model, { ...inputs, ...styledInputs(layers, model, inputs) }, h),
  );
