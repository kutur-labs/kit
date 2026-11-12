// Layered styles the checks in src/internal/part.ts must keep accepting: each line compiles only
// while no check rejects valid code.
import { Button, DatePicker, Popover } from "@foldkit/ui";
import { ButtonStyle, DatePickerStyle, PopoverStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { vars } from "./markers.stylex.ts";

const styles = stylex.create({
  padding: { padding: 8 },
  paddingInline: { paddingInline: 16 },
  both: { padding: 4, paddingInline: 4 },
  gaps: { columnGap: 4, rowGap: 4 },
  ink: { [vars.ink]: "white" },
  inked: { [vars.ink]: "white", inlineSize: 256 },
});

const popoverLook = {
  panel: (state) => [styles.padding, state.isClosed && styles.ink],
} satisfies PopoverStyle.Styles;

// A longhand after its shorthand wins, so a later layer may set it.
export const longhandOverShorthand = ButtonStyle.view(
  Button.view,
  { button: styles.padding },
  { button: styles.paddingInline },
);

// A later shorthand is fine when the same layer also sets the earlier layer's longhand.
export const shorthandWithLonghand = ButtonStyle.view(
  Button.view,
  { button: styles.paddingInline },
  { button: styles.both },
);

// Tokens on an owned part, alone or next to properties the part can set.
export const tokensOnOwnedPart = PopoverStyle.view(Popover.view, popoverLook, {
  panel: [styles.ink, styles.inked],
});

// A state function in a later layer still gets its state type from Styles.
export const stateInLaterLayer = PopoverStyle.view(Popover.view, popoverLook, {
  button: (state) => state.isVisible && styles.paddingInline,
});

// Styles spread from an array are checked part by part only.
const looks = [popoverLook, { panel: styles.paddingInline }];

export const spreadLayers = PopoverStyle.view(Popover.view, ...looks);

// A library's own styles before an app's layers, as a theme's `restyle` puts them: a later layer
// may set a longhand over the earlier shorthand, and a state function keeps its state type.
const buttonLook = { button: styles.padding } satisfies ButtonStyle.Styles;

const restyleButton = <const List extends ReadonlyArray<ButtonStyle.Styles>>(
  ...layers: ButtonStyle.Layers<List, [typeof buttonLook]>
) => ButtonStyle.view(Button.view, buttonLook, ...layers);

export const layersOverALook = restyleButton(
  { button: styles.paddingInline },
  { button: (state) => state.isDisabled && styles.ink },
);

// DatePicker's calendar layers like any other parts.
export const calendarLayers = DatePickerStyle.view(
  DatePicker.view,
  { calendar: { grid: styles.gaps } },
  { calendar: { grid: styles.gaps, cell: styles.padding } },
);
