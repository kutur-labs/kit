// expect: "@foldkit/ui sets width inline on this part. Its width follows the value; style its height and color."
import { Meter } from "@foldkit/ui";
import { MeterStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = MeterStyle.view(Meter.view, { fill: s.full });
