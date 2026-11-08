// expect: "FileDrop's input is visually hidden: style root, with ':has(:focus-visible)' for keyboard focus."
import { FileDrop } from "@foldkit/ui";
import { FileDropStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ ring: { outlineStyle: "solid" } });

export const x = FileDropStyle.view(FileDrop.view, { input: styles.ring });
