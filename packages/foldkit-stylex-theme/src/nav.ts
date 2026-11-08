import type { NavStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { color, fontSize, motion, radius, size, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  nav: { display: "flex", flexWrap: "wrap", gap: space.xs },
  link: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minInlineSize: size.target,
    minBlockSize: size.target,
    paddingInline: space.md,
    borderRadius: radius.control,
    backgroundColor: { default: "transparent", ":hover": color.hover },
    color: { default: color.muted, ":hover": color.text },
    fontSize: fontSize.md,
    textDecorationLine: "underline",
    textDecorationColor: "transparent",
    textDecorationThickness: 2,
    textUnderlineOffset: space.xs,
    transitionDuration: motion.fast,
    transitionProperty: "color, background-color, text-decoration-color",
  },
  current: { color: color.text, textDecorationColor: color.accent },
});

/**
 * The look of a Nav: a row of links, each a 44px target, the current one underlined with the
 * accent. Render each link as a direct child of the `<nav>`.
 */
export const navTheme = {
  nav: styles.nav,
  link: (state) => [styles.link, base.focusRing, state.isCurrent && styles.current],
} satisfies NavStyle.Styles;
