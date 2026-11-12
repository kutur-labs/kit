import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import {
  color,
  fontSize,
  fontWeight,
  lineHeight,
  space,
} from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

// Listbox, Combobox and DatePicker have no label part, as Select and Input do, so a demo draws the
// label itself. It stays visible once a value is chosen, which a placeholder would not.

const styles = stylex.create({
  field: { display: "grid", justifyItems: "start", gap: space.sm },
  // As the theme draws Select's and Input's label parts.
  label: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.sm,
  },
});

/** The id of the label for the element `controlId`. */
export const labelId = (controlId: string) => `${controlId}-label`;

/**
 * An `ariaLabelledBy` that names the button `buttonId` by its label, then by the value it shows, so
 * its name holds the visible text (WCAG 2.5.3).
 */
export const labelledBy = (buttonId: string) => `${labelId(buttonId)} ${buttonId}`;

/** `control` and what follows it, under a visible label for the element `controlId`. */
export const field = <Message>(
  h: HtmlBuilder<Message>,
  label: Readonly<{ controlId: string; text: string }>,
  control: ReadonlyArray<Html>,
): Html =>
  h.div(
    [sx(styles.field)],
    [
      h.label(
        [h.Id(labelId(label.controlId)), h.For(label.controlId), sx(styles.label)],
        [label.text],
      ),
      ...control,
    ],
  );
