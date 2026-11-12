// @foldkit/ui's Menu with `create` themed, plus `restyle` and `buttonContent`.
import type { Html } from "foldkit/html";
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/menu";
import { MenuStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { base } from "./base.ts";
import { field } from "./field.ts";
import { list } from "./list.ts";
import { listItems } from "./markers.stylex.ts";
import { chevron, labelled } from "./marks.ts";

export * from "@foldkit/ui/menu";

const styles = stylex.create({
  // Focus stays on the panel while the active item moves, so the active item shows focus. A menu
  // of actions may be wider than its button, never narrower than 12rem.
  items: { minInlineSize: "max(12rem, var(--button-width, 0px))", outlineStyle: "none" },
});

// An outlined button and a raised panel of actions whose active item takes the subtle fill.
const theme = {
  button: (state) => [
    base.button,
    field.trigger,
    base.focusRing,
    state.isButtonDisabled && base.disabledButton,
  ],
  items: (state) => [
    base.panel,
    base.transition,
    list.items,
    listItems,
    styles.items,
    state.isClosed && base.closed,
  ],
  item: (state) => [
    list.item,
    base.highlight,
    state.isActive && [list.activeItem, base.systemColors],
    state.isDisabled && base.disabled,
  ],
  heading: list.heading,
  separator: [list.separator, base.borderFill],
} satisfies MenuStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = MenuStyle.Styles;

/** `Menu.ViewInputs` without the class names the theme fills. */
export type ViewInputs<Item extends string> = MenuStyle.ViewInputs<Item>;

/** `Menu.Bundle` with the themed view. */
export type Bundle<Item extends string = string> = Omit<Core.Bundle<Item>, "view"> &
  Readonly<{ view: View<Core.Model, Core.Message, ViewInputs<Item>> }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: MenuStyle.Layers<List, [typeof theme]>
) => {
  // Foldkit types a Submodel view as a conditional type, which stays unresolved for a generic
  // Item, so no generic body can pass `create<Item>().view` to the core. @foldkit/ui's view is the
  // same function for every Item, so the body styles the string instance and the overload states
  // the per-Item type: TypeScript checks an implementation against its overloads with Item erased.
  function create<Item extends string = string>(): Bundle<Item>;
  function create(): Bundle {
    const bundle = Core.create();

    return { ...bundle, view: MenuStyle.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Menu.create`, its view styled by the theme. */
export const { create } = restyle();

/** The `buttonContent` input: `label`, then a chevron that turns over while the menu is open. */
export const buttonContent = (label: Html | string, model: Readonly<{ isOpen: boolean }>): Html =>
  labelled(label, chevron(model.isOpen));
