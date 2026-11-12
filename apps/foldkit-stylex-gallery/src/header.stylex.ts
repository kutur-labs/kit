import { size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

import { media } from "./media.stylex.ts";

/** What the gallery's sticky header covers. */
export const header = stylex.defineVars({
  // The block size of the top of the viewport that the header covers: a row of size.control
  // pickers, their padding and the hairline under them, so it grows with the touch size. Below
  // 40rem the header scrolls away with the page and covers nothing. The name is literal so that
  // styles.css can set the document's scroll padding from it, as StyleX cannot style <html>.
  "--gallery-header-cover": {
    default: `calc(${size.control} + 2 * ${space.sm} + 1px)`,
    [media.narrow]: "0px",
  },
});
