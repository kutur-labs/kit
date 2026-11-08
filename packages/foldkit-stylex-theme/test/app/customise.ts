// The README's customising table, as an app writes it. `typecheck` checks the types and
// test/customise.test.ts compiles the styles with StyleX.
import { Checkbox, Popover } from "@foldkit/ui";
import { CheckboxStyle, PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";
import { checkboxIndicator, checkboxTheme } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { popoverTheme } from "@kutur-kit/foldkit-stylex-theme/popover";
import { color, radius, size } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  wide: { maxInlineSize: "32rem" },
  // Single tokens for one part: the portaled panel included, and no other token resets.
  inverted: {
    [color.surface]: "light-dark(#18181b, #ffffff)",
    [color.text]: "light-dark(#ffffff, #18181b)",
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

// Use a look, and the child style for the tick the app renders.
export const checkboxView = CheckboxStyle.view(Checkbox.view, checkboxTheme);

export const tick = (isChecked: boolean) =>
  sx(checkboxIndicator.tick, isChecked && checkboxIndicator.ticked);

// Extend some parts: later styles objects win property by property.
export const widePopoverView = PopoverStyle.view(Popover.view, popoverTheme, {
  panel: styles.wide,
});

// Replace a part.
export const plainPopoverView = PopoverStyle.view(Popover.view, {
  ...popoverTheme,
  panel: styles.wide,
});

// Change tokens for one part.
export const invertedPopoverView = PopoverStyle.view(Popover.view, popoverTheme, {
  panel: styles.inverted,
});

// An own look, without the theme's looks.
export const stampTheme = {
  checkbox: (state) => [styles.stamp, state.isChecked && styles.inked],
} satisfies CheckboxStyle.Styles;

export const stampView = CheckboxStyle.view(Checkbox.view, stampTheme);
