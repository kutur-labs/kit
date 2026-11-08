// expect: "This part has one class in every state, so pass its styles, not a function of state."
import { Nav } from "@foldkit/ui";
import { NavStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = NavStyle.view(Nav.view, { nav: () => [s.base] });
