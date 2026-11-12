import type { Has, Reads, Styles } from "./internal/calendar.ts";
import type { CheckedLayers } from "./internal/part.ts";
import type { Supported } from "./internal/supported.ts";
import type { Calendar } from "@foldkit/ui";

import { defineView, type View } from "foldkit/submodel";

import { styledAttributes } from "./internal/calendar.ts";

export type { CellState, State, Styles } from "./internal/calendar.ts";

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Calendar", Before>;

/**
 * `Calendar.view` with each part's styles on the attributes `toView` gets; pass it to `h.submodel`
 * as `view`. Pass several styles objects to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  calendarView: Supported<
    "Calendar",
    Has<Calendar.ViewInputs>,
    Reads<"toView">,
    typeof Calendar.view
  >,
  ...layers: Layers<List>
): View<Calendar.Model, Calendar.Message, Calendar.ViewInputs> =>
  defineView<Calendar.Model, Calendar.Message, Calendar.ViewInputs>((model, inputs, h) =>
    calendarView(
      model,
      { ...inputs, toView: (attributes) => inputs.toView(styledAttributes(layers, attributes)) },
      h,
    ),
  );
