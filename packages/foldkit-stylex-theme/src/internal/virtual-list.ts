// @foldkit/ui's VirtualList with `view` themed, plus `restyle` and the styles of a row's content.
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/virtualList";
import { VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, lineHeight, radius, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/virtualList";

const styles = stylex.create({
  // Bounded, so the list scrolls; layer an own `blockSize` over it to change the height. Scrolling
  // to its end leaves the page still.
  container: {
    blockSize: "20rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    backgroundColor: color.surface,
    color: color.text,
    overscrollBehavior: "contain",
  },
});

// A bordered panel 20rem high that scrolls, with a focus ring for browsers that let the keyboard
// focus a scroller.
const theme = {
  container: [styles.container, base.focusRing],
} satisfies VirtualListStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = VirtualListStyle.Styles;

/** `VirtualList.ViewInputs` without the container's class name, which the theme fills. */
export type ViewInputs<Item> = VirtualListStyle.ViewInputs<Item>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: VirtualListStyle.Layers<List, [typeof theme]>
) => ({
  // Annotated, so that this package's declarations name the Model and Message rather than spell
  // them out.
  view: <Item>(): View<Core.Model, Core.Message, ViewInputs<Item>> =>
    VirtualListStyle.view(Core.view<Item>(), theme, ...layers),
});

/** `VirtualList.view`, styled by the theme. */
export const { view } = restyle();

/**
 * The element `itemToView` returns, which fills its row: `sx(VirtualList.row.body)`, with
 * `sx(VirtualList.row.detail)` on secondary text inside it.
 */
export const row = stylex.create({
  body: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minInlineSize: 0,
    overflow: "hidden",
    paddingInline: space.md,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    // Counts and ids keep one width from row to row, so they line up down the list.
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  detail: { color: color.muted, fontSize: fontSize.sm },
});
