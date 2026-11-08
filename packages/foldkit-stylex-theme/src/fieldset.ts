import type { FieldsetStyle } from "@kutur-kit/foldkit-stylex";

import * as stylex from "@stylexjs/stylex";

import { base } from "./internal/base.ts";
import { field } from "./internal/field.ts";
import { color, fontSize, radius, space } from "./tokens.stylex.ts";

const styles = stylex.create({
  // A grid, so the fields inside are spaced without styles of their own.
  fieldset: {
    display: "grid",
    gap: space.md,
    minInlineSize: 0,
    margin: 0,
    padding: space.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    color: color.text,
  },
  legend: {
    paddingInline: space.xs,
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: 600,
  },
});

/**
 * The look of a Fieldset: a framed group that spaces its fields. While disabled it dims its legend
 * and description only; each control inside dims through its own `isDisabled`, so nothing dims
 * twice.
 */
export const fieldsetTheme = {
  fieldset: styles.fieldset,
  legend: (state) => [styles.legend, state.isDisabled && base.disabled],
  description: (state) => [field.description, state.isDisabled && base.disabled],
} satisfies FieldsetStyle.Styles;
