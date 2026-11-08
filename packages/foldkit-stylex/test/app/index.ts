// The app vite.test.ts builds. StyleX appends its rules to the stylesheet index.html links.
import * as stylex from "@stylexjs/stylex";

// Each value is one that Lightningcss rewrites for Chrome 80 unless its options say otherwise.
export const styles = stylex.create({
  panel: { inset: 0, backgroundColor: "oklch(60% 0.1 200)", color: "light-dark(black, white)" },
});
