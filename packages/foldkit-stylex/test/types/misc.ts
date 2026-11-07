import type { HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import { PopoverStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { row, vars } from "./markers.stylex.ts";

const theme = stylex.createTheme(vars, { ink: "red" });

const styles = stylex.create({
  a: { color: "red", opacity: { default: 1, [stylex.when.ancestor(":hover", row)]: 0.5 } },
});

export const withMarker = sx(styles.a, row);

export const withTheme = sx(styles.a, theme);

export const onPart = PopoverStyle.view(Popover.view, { panel: [styles.a, row], button: theme });

export const textarea = <M>(h: HtmlBuilder<M>) => h.textarea([sx(styles.a)]);
