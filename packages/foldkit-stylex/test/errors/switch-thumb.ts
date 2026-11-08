// expect: "Switch renders no thumb part: draw it inside the button with sx(...)"
import { Switch } from "@foldkit/ui";
import { SwitchStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = SwitchStyle.view(Switch.view, { thumb: s.base });
