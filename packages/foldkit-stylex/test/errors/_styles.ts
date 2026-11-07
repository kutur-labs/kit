import * as stylex from "@stylexjs/stylex";

export const s = stylex.create({
  base: { padding: 16 },
  open: { fontWeight: 700 },
  absolute: { position: "absolute" },
  shifted: { translate: "4px 0" },
  raised: { zIndex: 5 },
  tall: { maxHeight: 400 },
  pressed: { transform: "scale(1.2)" },
  tilt: (deg: number) => ({ rotate: `${deg}deg` }),
});
