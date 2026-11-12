// The README's customising table, as an app writes it. `typecheck` checks the types and
// test/customise.test.ts compiles the styles with StyleX.
import { Checkbox as UiCheckbox } from "@foldkit/ui";
import { CheckboxStyle } from "@kutur-kit/foldkit-stylex";
import { Checkbox } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { Popover } from "@kutur-kit/foldkit-stylex-theme/popover";
import { color, radius, size } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const surface = "light-dark(#18181b, #ffffff)";

const text = "light-dark(#ffffff, #18181b)";

const styles = stylex.create({
  wide: { maxInlineSize: "32rem" },
  // null drops the theme's value.
  unpadded: { padding: null },
  // Tokens for one part, the portaled panel included. The greys, accent and onAccent resolve from
  // surface and text at :root, so a part that swaps those two sets them too.
  inverted: {
    [color.surface]: surface,
    [color.text]: text,
    [color.subtle]: `color-mix(in oklab, ${text} 5%, ${surface})`,
    [color.border]: `color-mix(in oklab, ${text} 10%, ${surface})`,
    [color.control]: `color-mix(in oklab, ${text} 50%, ${surface})`,
    [color.muted]: `color-mix(in oklab, ${text} 62%, ${surface})`,
    [color.accent]: text,
    [color.onAccent]: surface,
  },
  // An own look built on the tokens, so overrides and a theme picker restyle it too.
  stamp: {
    inlineSize: size.target,
    blockSize: size.target,
    borderWidth: 3,
    borderStyle: "double",
    borderColor: color.text,
    borderRadius: radius.control,
  },
  inked: { backgroundColor: color.accent },
});

// Use a component, and the mark the app renders inside it.
export const checkboxView = Checkbox.view;

export const tick = (isChecked: boolean) => Checkbox.mark({ isChecked });

// Extend some parts: later styles objects win property by property.
export const widePopoverView = Popover.restyle({ panel: styles.wide }).view;

// Drop a property the theme sets.
export const unpaddedPopoverView = Popover.restyle({ panel: styles.unpadded }).view;

// Change tokens for one part.
export const invertedPopoverView = Popover.restyle({ panel: styles.inverted }).view;

// An own look, without the theme's looks.
export const stampTheme = {
  checkbox: (state) => [styles.stamp, state.isChecked && styles.inked],
} satisfies CheckboxStyle.Styles;

export const stampView = CheckboxStyle.view(UiCheckbox.view, stampTheme);
