// expect: "Pass static styles only. For a runtime value, set a custom property with h.Style({ '--x': value }) and read it with var(--x) in a static style."
import { sx } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = sx(s.tilt(3));
