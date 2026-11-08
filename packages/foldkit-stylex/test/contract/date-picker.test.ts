import type { HtmlBuilder } from "foldkit/html";

import { DatePicker, Popover } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Match, Option } from "effect";
import * as Dates from "foldkit/calendar";
import { childAttributes } from "foldkit/html";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { DatePickerStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  isClosed: { scale: 0.95 },
  wrapper: { display: "inline-block" },
  backdrop: { backgroundColor: "black" },
  panel: { padding: 16 },
  above: { zIndex: 20 },
  today: { textDecorationLine: "underline" },
  todayOverride: { textDecorationLine: "overline" },
  grid: { display: "grid" },
});

const datePickerView = DatePickerStyle.view(DatePicker.view, {
  wrapper: styles.wrapper,
  trigger: (state) => [state.isVisible && styles.isVisible, state.isDisabled && styles.isDisabled],
  backdrop: styles.backdrop,
  panel: (state) => [styles.panel, state.isClosed && styles.isClosed],
  calendar: { grid: styles.grid, cell: (state) => state.isToday && styles.today },
});

// The optional inputs this test varies, left out where it checks their defaults.
type Model = Readonly<{
  datePicker: DatePicker.Model;
  inputs: Pick<DatePicker.ViewInputs, "isDisabled">;
}>;

const viewWith =
  (styledView: typeof datePickerView) => (model: Model, h: HtmlBuilder<DatePicker.Message>) =>
    styledView(
      model.datePicker,
      {
        ...model.inputs,
        anchor: { placement: "bottom-start" },
        maybeSelectedDate: Option.none(),
        attributes: childAttributes([h.Id("wrapper")]),
        backdropAttributes: childAttributes([h.Id("backdrop")]),
        triggerContent: () => h.span([], ["Due date"]),
        toCalendarView: (attributes) =>
          h.div(
            [...attributes.grid],
            Match.valueTags(attributes, {
              Days: ({ weeks }) =>
                weeks.flatMap((week) =>
                  week.cells.map((cell) => h.div([...cell.cellAttributes], [cell.label])),
                ),
              Months: () => [],
              Years: () => [],
            }),
          ),
      },
      h,
    );

const view = viewWith(datePickerView);

const update = (model: Model, message: DatePicker.Message) => ({
  model: { ...model, datePicker: DatePicker.update(model.datePicker, message).model },
});

const closed = DatePicker.init({ id: "due", today: Dates.make(2026, 11, 7), isAnimated: true });

const open = DatePicker.open(closed).model;

const at = (transitionState: Popover.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...open,
  popover: { ...open.popover, isOpen, animation: { ...open.popover.animation, transitionState } },
});

// The panel's Mounts, which Scene requires resolved whenever the panel renders.
const mounts = [
  Scene.Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover()),
  Scene.Mount.resolve(
    Popover.PortalPopoverBackdrop,
    Popover.Message.CompletedPortalPopoverBackdrop(),
  ),
];

const trigger = Scene.selector(`#${DatePicker.triggerId("due")}`);

const panel = Scene.selector("#due-popover-panel");

const today = Scene.selector("#due-calendar-cell-2026-11-7");

describe("DatePickerStyle.view", () => {
  const scenarios = [
    { name: "closed", datePicker: closed, isVisible: false, isClosed: false },
    { name: "open", datePicker: at("Idle", true), isVisible: true, isClosed: false },
    { name: "EnterStart", datePicker: at("EnterStart", true), isVisible: true, isClosed: true },
    {
      name: "EnterAnimating",
      datePicker: at("EnterAnimating", true),
      isVisible: true,
      isClosed: false,
    },
    { name: "LeaveStart", datePicker: at("LeaveStart", false), isVisible: true, isClosed: false },
    {
      name: "LeaveAnimating",
      datePicker: at("LeaveAnimating", false),
      isVisible: true,
      isClosed: true,
    },
  ];

  for (const { name, datePicker, isVisible, isClosed } of scenarios) {
    it(`sets isVisible and isClosed where @foldkit/ui sets data-open and data-closed: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ datePicker, inputs: {} }),
        ...agrees(trigger, "data-open", styles.isVisible, isVisible),
        ...(isVisible
          ? [...agrees(panel, "data-closed", styles.isClosed, isClosed), ...mounts]
          : []),
      );
    });
  }

  for (const inputs of [{}, { isDisabled: false }, { isDisabled: true }]) {
    it(`sets isDisabled where @foldkit/ui sets data-disabled: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ datePicker: closed, inputs }),
        ...agrees(trigger, "data-disabled", styles.isDisabled, inputs.isDisabled === true),
      );
    });
  }

  it("puts the functional CSS and each part's styles on its element, the calendar's included", () => {
    Scene.scene(
      { update, view },
      Scene.given({ datePicker: open, inputs: {} }),
      ...hasStyles(Scene.selector("#wrapper"), anchored.wrapper, styles.wrapper),
      ...hasStyles(panel, anchored.panel, styles.panel),
      ...hasStyles(Scene.selector("#backdrop"), anchored.backdrop, styles.backdrop),
      ...hasStyles(Scene.selector("#due-calendar-grid"), styles.grid),
      ...hasStyles(today, styles.today),
      Scene.expect(Scene.selector("#due-calendar-cell-2026-11-8")).not.toHaveClass(
        classOf(styles.today),
      ),
      ...mounts,
    );
  });

  it("layers the calendar's styles like the other parts'", () => {
    const layered = DatePickerStyle.view(
      DatePicker.view,
      { calendar: { cell: (state) => state.isToday && styles.today } },
      { panel: styles.above, calendar: { cell: styles.todayOverride } },
    );

    Scene.scene(
      { update, view: viewWith(layered) },
      Scene.given({ datePicker: open, inputs: {} }),
      ...hasStyles(today, styles.todayOverride),
      Scene.expect(today).not.toHaveClass(classOf(styles.today)),
      ...hasStyles(panel, styles.above),
      Scene.expect(panel).not.toHaveClass(classOf(anchored.panel)),
      ...mounts,
    );
  });

  it("still opens from a click on the styled trigger", () => {
    Scene.scene(
      { update, view },
      Scene.given({ datePicker: closed, inputs: {} }),
      Scene.click(trigger),
      Scene.expect(trigger).toHaveAttr("data-open"),
      Scene.expect(trigger).toHaveClass(classOf(styles.isVisible)),
      ...hasStyles(today, styles.today),
      ...mounts,
    );
  });
});
