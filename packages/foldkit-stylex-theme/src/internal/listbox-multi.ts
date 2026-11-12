// @foldkit/ui's Listbox.Multi with `create` themed, plus `restyle`. @foldkit/ui exports Multi as a
// namespace, which `export *` cannot spread, so its members are re-exported by name;
// test/multi.ts keeps the list whole.
import type { View } from "foldkit/submodel";

import { Multi as Core, type Message } from "@foldkit/ui/listbox";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import { theme } from "./listbox-theme.ts";

export const { init, Model, buttonId } = Core;

export type Model = Core.Model;

export type InitConfig = Core.InitConfig;

/** `Listbox.Multi.ViewInputs` without the class names the theme fills. */
export type ViewInputs<Item, Value extends string = string> = ListboxStyle.Multi.ViewInputs<
  Item,
  Value
>;

/** `Listbox.Multi.Bundle` with the themed view. */
export type Bundle<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> = Omit<Core.Bundle<Item, Value>, "view"> &
  Readonly<{ view: View<Core.Model, Message, ViewInputs<Item, Value>> }>;

/** The theme with `layers` over it; it takes the same styles as `Listbox.restyle`. */
export const restyle = <const List extends ReadonlyArray<ListboxStyle.Styles>>(
  ...layers: ListboxStyle.Layers<List, [typeof theme]>
) => {
  // As in listbox.ts: the body styles the string instance, and the overload states the per-Item
  // type.
  function create<
    Item = string,
    Value extends string = Item extends string ? Item : string,
  >(): Bundle<Item, Value>;
  function create(): Bundle<string, string> {
    const bundle = Core.create();

    return { ...bundle, view: ListboxStyle.Multi.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Listbox.Multi.create`, its view styled by the theme. */
export const { create } = restyle();
