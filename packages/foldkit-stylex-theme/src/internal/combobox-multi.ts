// @foldkit/ui's Combobox.Multi with `create` themed, plus `restyle`. @foldkit/ui exports Multi as a
// namespace, which `export *` cannot spread, so its members are re-exported by name;
// test/multi.ts keeps the list whole.
import type { View } from "foldkit/submodel";

import { Multi as Core, type Message } from "@foldkit/ui/combobox";
import { ComboboxStyle } from "@kutur-kit/foldkit-stylex";

import { theme } from "./combobox-theme.ts";

export const { init, Model, inputId } = Core;

export type Model = Core.Model;

export type InitConfig = Core.InitConfig;

/** `Combobox.Multi.ViewInputs` without the class names the theme fills. */
export type ViewInputs<Item extends string> = ComboboxStyle.Multi.ViewInputs<Item>;

/** `Combobox.Multi.Bundle` with the themed view. */
export type Bundle<Item extends string = string> = Omit<Core.Bundle<Item>, "view"> &
  Readonly<{ view: View<Core.Model, Message, ViewInputs<Item>> }>;

/** The theme with `layers` over it; it takes the same styles as `Combobox.restyle`. */
export const restyle = <const List extends ReadonlyArray<ComboboxStyle.Styles>>(
  ...layers: ComboboxStyle.Layers<List, [typeof theme]>
) => {
  // As in combobox.ts: the body styles the string instance, and the overload states the per-Item
  // type.
  function create<Item extends string = string>(): Bundle<Item>;
  function create(): Bundle {
    const bundle = Core.create();

    return { ...bundle, view: ComboboxStyle.Multi.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Combobox.Multi.create`, its view styled by the theme. */
export const { create } = restyle();
