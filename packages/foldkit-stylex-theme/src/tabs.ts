import type { TabsStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  tablist: {
    display: "flex",
    gap: space.xs,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  verticalTablist: {
    flexDirection: "column",
    borderBlockEndWidth: 0,
    borderInlineEndWidth: 1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
  },
  // The bottom edge overlaps the tablist's, so the active tab's line replaces it.
  tab: {
    minBlockSize: size.target,
    marginBlockEnd: -1,
    paddingBlock: 0,
    paddingInline: space.md,
    borderWidth: 0,
    borderBlockEndWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: { default: color.muted, ":hover": color.text },
    fontFamily: "inherit",
    fontSize: fontSize.md,
    cursor: "pointer",
    transitionDuration: motion.fast,
    transitionProperty: "color, border-color",
  },
  verticalTab: {
    marginBlockEnd: 0,
    marginInlineEnd: -1,
    borderBlockEndWidth: 0,
    borderInlineEndWidth: 2,
    textAlign: "start",
  },
  activeTab: { borderColor: color.accent, color: color.text },
  panel: { paddingBlock: space.md, color: color.text },
});

/** The look of Tabs: muted tabs on a line, the active one underlined with the accent. */
export const tabsTheme = {
  tablist: (state) => [styles.tablist, state.orientation === "Vertical" && styles.verticalTablist],
  tab: (state) => [
    styles.tab,
    base.focusRing,
    state.orientation === "Vertical" && styles.verticalTab,
    state.isActive && styles.activeTab,
    state.isDisabled && base.disabled,
  ],
  panel: [styles.panel, base.focusRing],
} satisfies TabsStyle.Styles;
