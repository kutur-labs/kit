import type * as CalendarParts from "./internal/calendar.ts";
import type { ClassNames, FilledFromStyles } from "./internal/filled.ts";
import type { Supported } from "./internal/supported.ts";
import type { DatePicker } from "@foldkit/ui";

import { defineView, type View } from "foldkit/submodel";

import { styledAttributes } from "./internal/calendar.ts";
import { anchored } from "./internal/functional-styles.ts";
import { partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";
import { visibilityOf, type TransitionState } from "./internal/transition.ts";
import { sxClassName } from "./sx.ts";

// CalendarStyle's state types, here too: a DatePicker look's declarations name the state of its
// `calendar` part's functions through DatePickerStyle, the namespace their file imports.
export type {
  CellState as CalendarCellState,
  State as CalendarState,
} from "./internal/calendar.ts";

/** A date picker's state, the same for each of its parts but `calendar`'s. */
export interface State {
  /**
   * The panel is rendered: open, or playing its leave animation. @foldkit/ui sets `data-open` on
   * the trigger then. For a fade, style `isClosed`: this stays true while the panel leaves.
   */
  readonly isVisible: boolean;
  /**
   * True where @foldkit/ui sets `data-closed` on the panel: the first frame of the enter animation
   * and the leave animation. Put `transition*` on the base style and the closed values here.
   */
  readonly isClosed: boolean;
  /**
   * The `isDisabled` input; @foldkit/ui sets `aria-disabled` and `data-disabled` on the trigger,
   * which stays focusable and does not open the panel.
   */
  readonly isDisabled: boolean;
}

// A Calendar part at the top level, which fails with a message that names where it goes.
type CalendarPartsHere = {
  readonly [
    Part in keyof CalendarParts.Styles
  ]?: `DatePicker styles its calendar under calendar: put these styles under calendar.${Part}.`;
};

/**
 * Styles for each part of a DatePicker. @foldkit/ui puts the trigger in a `div` inside `wrapper`
 * that takes no class, so a flex or grid layout on `wrapper` arranges that `div`, not the trigger.
 */
export interface Styles extends CalendarPartsHere {
  /** The positioned element around the trigger and the hidden form input. */
  readonly wrapper?: PartStyle<State>;
  /** @foldkit/ui lifts it to `position: relative; z-index: 1` while the panel is open. */
  readonly trigger?: PartStyle<State>;
  /** Covers the viewport while open, to catch outside clicks; style its color and opacity. */
  readonly backdrop?: PartStyle<State>;
  /** Floating UI positions it and caps its height. It renders outside your view, so set `color`. */
  readonly panel?: PartStyle<State>;
  /** The calendar inside the panel, styled as `CalendarStyle.view` styles one. */
  readonly calendar?: CalendarParts.Styles;
  readonly button?: "DatePicker calls its button trigger: put these styles under trigger.";
}

type Filled = FilledFromStyles<{
  className: "wrapper";
  triggerClassName: "trigger";
  backdropClassName: "backdrop";
  panelClassName: "panel";
}>;

// Everything this module reads from @foldkit/ui's DatePicker and the Calendar it renders. `stateOf`
// and `styledAttributes` read only these, and `Supported` checks that the installed @foldkit/ui
// still has them.
type Reads = CalendarParts.Reads<"toCalendarView"> &
  Readonly<{
    Model: Readonly<{
      popover: Readonly<{
        isOpen: boolean;
        animation: Readonly<{ transitionState: TransitionState }>;
      }>;
    }>;
    ViewInputs: ClassNames<Filled> & Readonly<{ isDisabled?: boolean }>;
  }>;

type Has = CalendarParts.Has<DatePicker.ViewInputs> & Readonly<{ Model: DatePicker.Model }>;

const stateOf = (model: Reads["Model"], inputs: Reads["ViewInputs"]): State => ({
  ...visibilityOf(model.popover.isOpen, model.popover.animation.transitionState),
  isDisabled: inputs.isDisabled ?? false,
});

/** `DatePicker.ViewInputs` without class names, which come from `styles`. */
export type ViewInputs = DatePicker.ViewInputs & Filled;

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "DatePicker", Before>;

/**
 * `DatePicker.view` with each part's styles, the calendar's included; pass it to `h.submodel` as
 * `view`. Pass several styles objects to layer them: later ones win property by property.
 */
export const view = <const List extends ReadonlyArray<Styles>>(
  datePickerView: Supported<"DatePicker", Has, Reads, typeof DatePicker.view>,
  ...layers: Layers<List>
): View<DatePicker.Model, DatePicker.Message, ViewInputs> =>
  defineView<DatePicker.Model, DatePicker.Message, ViewInputs>((model, inputs, h) => {
    const part = partsOf(layers, stateOf(model, inputs));
    const calendarLayers = layers.map((styles) => styles.calendar ?? {});

    return datePickerView(
      model,
      {
        ...inputs,
        className: sxClassName(
          anchored.wrapper,
          part((s) => s.wrapper),
        ),
        triggerClassName: sxClassName(part((s) => s.trigger)),
        backdropClassName: sxClassName(
          anchored.backdrop,
          part((s) => s.backdrop),
        ),
        panelClassName: sxClassName(
          anchored.panel,
          part((s) => s.panel),
        ),
        toCalendarView: (attributes) =>
          inputs.toCalendarView(styledAttributes(calendarLayers, attributes)),
      },
      h,
    );
  });
