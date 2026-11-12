// @foldkit/ui's Disclosure with `view` themed, plus `restyle` and `buttonContent`.
import type { Html } from "foldkit/html";

import * as Core from "@foldkit/ui/disclosure";
import { DisclosureStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, lineHeight, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { chevron, labelled } from "./marks.ts";

export * from "@foldkit/ui/disclosure";

const styles = stylex.create({
  // A row in the text color, its chevron space.sm from the end. It does not shrink on a press, as
  // base.button does: across a full-width row the edges would visibly jump.
  button: {
    inlineSize: "100%",
    paddingInlineEnd: space.sm,
    color: color.text,
    textAlign: "start",
    scale: null,
  },
  // Flat, because `animatePanel` clips it to its box. Its text lines up with the button's, inside
  // the button's edge, and the padding keeps the focus rings of links and buttons inside the panel
  // clear of that clip.
  panel: {
    paddingBlockStart: space.xs,
    paddingBlockEnd: space.md,
    paddingInline: `calc(${space.md} + 1px)`,
    color: color.muted,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
});

// A full-width quiet button, filled on hover, over a flat panel, which `animatePanel` may wrap.
const theme = {
  button: (state) => [
    base.button,
    base.quietButton,
    base.focusRing,
    styles.button,
    state.isDisabled && base.disabledButton,
  ],
  panel: styles.panel,
} satisfies DisclosureStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = DisclosureStyle.Styles;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: DisclosureStyle.Layers<List, [typeof theme]>
) => ({ view: DisclosureStyle.view(Core.view, theme, ...layers) });

/** `Disclosure.view`, styled by the theme. */
export const { view } = restyle();

/** The `button`'s content: `label`, then a chevron that turns over while the panel is open. */
export const buttonContent = (label: Html | string, config: Readonly<{ isOpen: boolean }>): Html =>
  labelled(label, chevron(config.isOpen));
