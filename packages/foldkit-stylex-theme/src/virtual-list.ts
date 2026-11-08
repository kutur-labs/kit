import type { VirtualListStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, radius, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // Bounded, so the list scrolls; layer an own `blockSize` over it to change the height.
  container: {
    blockSize: "20rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    backgroundColor: color.surface,
    color: color.text,
  },
});

/**
 * The look of a VirtualList: a bordered panel 20rem high that scrolls, with a focus ring for
 * browsers that let the keyboard focus a scroller. Style each row with `virtualListRow`.
 */
export const virtualListTheme = {
  container: [styles.container, base.focusRing],
} satisfies VirtualListStyle.Styles;

/**
 * The element `itemToView` returns, which fills its row: `sx(virtualListRow.row)`, with
 * `sx(virtualListRow.detail)` on secondary text inside it.
 */
export const virtualListRow = stylex.create({
  row: {
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
    whiteSpace: "nowrap",
  },
  detail: { color: color.muted, fontSize: fontSize.sm },
});
