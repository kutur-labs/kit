// expect: "@foldkit/ui sets bottom, display, flexDirection, gap, left, padding, pointerEvents, position, right, top, transform and zIndex inline on this part, and flexWrap works together with them, so a value of yours would change what they do. Style each entry instead."
import { Toast as Ui } from "@foldkit/ui";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

const styles = stylex.create({ wrapping: { flexWrap: "wrap" } });

export const x = ToastStyle.view(Toast.view, { container: styles.wrapping });
