// @foldkit/ui's Listbox with `create` themed, plus `restyle` and the content helpers.
import type { Html } from "foldkit/html";
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/listbox";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import { theme } from "./listbox-theme.ts";
import { chevron, labelled, placeholder as muted, tick } from "./marks.ts";

export * from "@foldkit/ui/listbox";

export * as Multi from "./listbox-multi.ts";

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = ListboxStyle.Styles;

/** `Listbox.ViewInputs` without the class names the theme fills. */
export type ViewInputs<Item, Value extends string = string> = ListboxStyle.ViewInputs<Item, Value>;

/** `Listbox.Bundle` with the themed view. */
export type Bundle<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> = Omit<Core.Bundle<Item, Value>, "view"> &
  Readonly<{ view: View<Core.Model, Core.Message, ViewInputs<Item, Value>> }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: ListboxStyle.Layers<List, [typeof theme]>
) => {
  // Foldkit types a Submodel view as a conditional type, which stays unresolved for a generic
  // Item, so no generic body can pass `create<Item>().view` to the core. @foldkit/ui's view is the
  // same function for every Item, so the body styles the string instance and the overload states
  // the per-Item type: TypeScript checks an implementation against its overloads with Item erased.
  function create<
    Item = string,
    Value extends string = Item extends string ? Item : string,
  >(): Bundle<Item, Value>;
  function create(): Bundle<string, string> {
    const bundle = Core.create();

    return { ...bundle, view: ListboxStyle.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Listbox.create`, its view styled by the theme. */
export const { create } = restyle();

/** The `buttonContent` input: `label`, then a chevron that turns over while the list is open. */
export const buttonContent = (label: Html | string, model: Readonly<{ isOpen: boolean }>): Html =>
  labelled(label, chevron(model.isOpen));

/** An item's `content`: `label`, then a tick at the end while the item is selected. */
export const itemContent = (label: Html | string, state: Readonly<{ isSelected: boolean }>): Html =>
  labelled(label, tick(state.isSelected));

/** A `buttonContent` label while nothing is chosen, muted as a field's placeholder is. */
export const placeholder = muted;
