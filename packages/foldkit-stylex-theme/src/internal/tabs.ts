// @foldkit/ui's Tabs with `create` themed, plus `restyle`.
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/tabs";
import { TabsStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, fontWeight, lineHeight, radius, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";

export * from "@foldkit/ui/tabs";

const styles = stylex.create({
  tablist: {
    display: "flex",
    gap: space.lg,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  verticalTablist: {
    flexDirection: "column",
    gap: 0,
    borderBlockEndWidth: 0,
    borderInlineEndWidth: 1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
  },
  // The bottom edge overlaps the tablist's, so the active tab's line replaces it. A tab has no
  // inline padding, so its line spans its label and the first label lines up with the panel's
  // text; it is at least size.target wide, so a short label keeps its target under a finger. Every
  // tab keeps a transparent line and one weight, so selecting one moves nothing. The focus ring
  // follows the corners away from the line, which stay square under it. Positioned for
  // base.hitArea, which gives back the corners that radius takes from the pointer.
  tab: {
    position: "relative",
    minInlineSize: size.target,
    minBlockSize: size.control,
    marginBlockEnd: -1,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderBlockEndWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    borderStartStartRadius: radius.control,
    borderStartEndRadius: radius.control,
    backgroundColor: "transparent",
    color: {
      default: color.muted,
      ":hover": { default: null, "@media (hover: hover)": color.text },
    },
    fontFamily: "inherit",
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.md,
    cursor: "pointer",
    transitionProperty: "color",
  },
  verticalTab: {
    marginBlockEnd: 0,
    marginInlineEnd: -1,
    borderBlockEndWidth: 0,
    borderInlineEndWidth: 2,
    borderStartEndRadius: 0,
    borderEndStartRadius: radius.control,
    paddingInlineEnd: space.md,
    textAlign: "start",
  },
  activeTab: { borderColor: color.accent, color: color.text },
  panel: { paddingBlock: space.md, color: color.text },
});

// Muted tabs on a line, the active one underlined with the accent.
const theme = {
  tablist: (state) => [styles.tablist, state.orientation === "Vertical" && styles.verticalTablist],
  tab: (state) => [
    styles.tab,
    base.hoverEase,
    base.focusRing,
    base.hitArea,
    state.orientation === "Vertical" && styles.verticalTab,
    state.isActive && styles.activeTab,
    state.isDisabled && base.disabledButton,
  ],
  panel: [styles.panel, base.focusRing],
} satisfies TabsStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = TabsStyle.Styles;

/** `Tabs.Bundle` with the themed view. */
export type Bundle<Value extends string = string> = Omit<Core.Bundle<Value>, "view"> &
  Readonly<{ view: View<Core.Model, Core.Message, Core.ViewInputs<Value>> }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: TabsStyle.Layers<List, [typeof theme]>
) => {
  // Foldkit types a Submodel view as a conditional type, which stays unresolved for a generic
  // Value, so no generic body can pass `create<Value>().view` to the core. @foldkit/ui's view is
  // the same function for every Value, so the body styles the string instance and the overload
  // states the per-Value type: TypeScript checks an implementation against its overloads with
  // Value erased.
  function create<Value extends string = string>(): Bundle<Value>;
  function create(): Bundle {
    const bundle = Core.create();

    return { ...bundle, view: TabsStyle.view(bundle.view, theme, ...layers) };
  }

  return { create };
};

/** `Tabs.create`, its view styled by the theme. */
export const { create } = restyle();
