// expect: "@kutur-kit/foldkit-stylex sets bottom, left, position, right, rotate, top and translate on this part so the component works, and inset overlaps what it sets. It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."
import { Popover } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ pinned: { inset: 0 } });

export const x = PopoverStyle.view(Popover.view, { arrow: styles.pinned });
