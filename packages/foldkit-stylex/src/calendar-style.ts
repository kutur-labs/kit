import type { Has, Reads, Styles } from "./internal/calendar.ts";
import type * as Own from "./internal/owned.ts";
import type { Layers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Calendar } from "@foldkit/ui";

import { defineView, type View } from "foldkit/submodel";

import { styledAttributes } from "./internal/calendar.ts";

export type { CellState, State, Styles } from "./internal/calendar.ts";

/**
 * `Calendar.view` with each part's styles on the attributes `toView` gets; pass it to `h.submodel`
 * as `view`. Pass several styles objects to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  calendarView: Supported<"Calendar", Has, Reads, typeof Calendar.view>,
  ...layers: Layers<List, Own.None>
): View<Calendar.Model, Calendar.Message, Calendar.ViewInputs> =>
  defineView<Calendar.Model, Calendar.Message, Calendar.ViewInputs>((model, inputs, h) =>
    calendarView(
      model,
      { ...inputs, toView: (attributes) => inputs.toView(styledAttributes(layers, attributes)) },
      h,
    ),
  );
