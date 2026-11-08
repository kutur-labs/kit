import * as stylex from "@stylexjs/stylex";

import { tokens } from "./_tokens.stylex.ts";

export const s = stylex.create({
  base: { padding: 16 },
  inline: { paddingInline: 8 },
  gap: { gap: 0 },
  gaps: { columnGap: 4, rowGap: 4 },
  tinted: { [tokens.surface]: "black" },
  inverted: { [tokens.surface]: "black", position: "absolute" },
  open: { fontWeight: 700 },
  absolute: { position: "absolute" },
  shifted: { translate: "4px 0" },
  raised: { zIndex: 5 },
  tall: { maxHeight: 400 },
  pressed: { transform: "scale(1.2)" },
  clickable: { pointerEvents: "auto" },
  full: { width: "100%" },
  tilt: (deg: number) => ({ rotate: `${deg}deg` }),
});
