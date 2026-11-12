// @foldkit/ui's Combobox with `create` themed, plus `restyle` and the content helpers.
import type { Html } from "foldkit/html";
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/combobox";
import { ComboboxStyle } from "@kutur-kit/foldkit-stylex";

import { theme } from "./combobox-theme.ts";
import { chevron, labelled, tick } from "./marks.ts";

export * from "@foldkit/ui/combobox";

export * as Multi from "./combobox-multi.ts";

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = ComboboxStyle.Styles;

/** `Combobox.ViewInputs` without the class names the theme fills. */
export type ViewInputs<Item extends string> = ComboboxStyle.ViewInputs<Item>;

/** `Combobox.Bundle` with the themed view. */
export type Bundle<Item extends string = string> = Omit<Core.Bundle<Item>, "view"> &
  Readonly<{ view: View<Core.Model, Core.Message, ViewInputs<Item>> }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: ComboboxStyle.Layers<List, [typeof theme]>
) => {
  // Foldkit types a Submodel view as a conditional type, which stays unresolved for a generic
  // Item, so no generic body can pass `create<Item>().view` to the core. @foldkit/ui's view is the
  // same function for every Item, so the body styles the string instance and the overload states
  // the per-Item type: TypeScript checks an implementation against its overloads with Item erased.
  function create<Item extends string = string>(): Bundle<Item>;
  function create(): Bundle {
    const bundle = Core.create();

    return { ...bundle, view: ComboboxStyle.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Combobox.create`, its view styled by the theme. */
export const { create } = restyle();

/** The `buttonContent` input: a chevron that turns over while the list is open. */
export const buttonContent = (model: Readonly<{ isOpen: boolean }>): Html => chevron(model.isOpen);

/** An item's `content`: `label`, then a tick at the end while the item is selected. */
export const itemContent = (label: Html | string, state: Readonly<{ isSelected: boolean }>): Html =>
  labelled(label, tick(state.isSelected));
