import type { Callbacks, Has } from "./internal/items.ts";
import type { Filled, ItemState, Reads, Styles } from "./internal/listbox.ts";
import type { Layers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Listbox } from "@foldkit/ui";
import type { Html, HtmlBuilder } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { styledInputs } from "./internal/listbox.ts";

/** `Listbox.Multi.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs<Item, Value extends string> = Listbox.Multi.ViewInputs<Item, Value> &
  Callbacks<Item, ItemState> &
  Filled;

/** A `Listbox.Multi.create` view with each part's styles; it takes the same styles as `ListboxStyle.view`. */
export const view = <Item, Value extends string, const List extends ReadonlyArray<Styles>>(
  listboxView: Supported<
    "Listbox.Multi",
    Has<Listbox.Multi.Model, Listbox.Multi.ViewInputs<unknown>>,
    Reads,
    (
      model: Listbox.Multi.Model,
      inputs: Listbox.Multi.ViewInputs<Item, Value>,
      h: HtmlBuilder<Listbox.Message>,
    ) => Html
  >,
  ...layers: Layers<List, Styles, "Listbox">
): View<Listbox.Multi.Model, Listbox.Message, ViewInputs<Item, Value>> =>
  defineView<Listbox.Multi.Model, Listbox.Message, ViewInputs<Item, Value>>((model, inputs, h) =>
    listboxView(model, { ...inputs, ...styledInputs(layers, model, inputs) }, h),
  );
