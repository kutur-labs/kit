import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { DatePicker, Popover } from "@foldkit/ui";
import { Option } from "effect";
import * as Dates from "foldkit/calendar";
import { childAttributes } from "foldkit/html";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what DatePicker's open trigger and panel own, and nothing on its wrapper and backdrop", () => {
  const trigger = owns<Own.Owns["DatePicker"]["trigger"]>()("position", "zIndex");
  const panel = owns<Own.Owns["DatePicker"]["panel"]>()("position", "margin", "visibility");
  // This package sets what the wrapper and backdrop own.
  const wrapper = owns<Own.Owns["DatePicker"]["wrapper"]>()();
  const backdrop = owns<Own.Owns["DatePicker"]["backdrop"]>()();

  const seen = {
    wrapper: new Set<string>(),
    trigger: new Set<string>(),
    backdrop: new Set<string>(),
    panel: new Set<string>(),
  };

  const closed = DatePicker.init({ id: "due", today: Dates.make(2026, 11, 7) });

  Scene.scene(
    {
      update: (model: DatePicker.Model) => ({ model }),
      view: (model: DatePicker.Model, h: HtmlBuilder<DatePicker.Message>) =>
        DatePicker.view(
          model,
          {
            anchor: {},
            maybeSelectedDate: Option.none(),
            attributes: childAttributes([h.Id("wrapper")]),
            backdropAttributes: childAttributes([h.Id("backdrop")]),
            triggerContent: () => h.span([], []),
            toCalendarView: () => h.div([], []),
          },
          h,
        ),
    },
    Scene.given(DatePicker.open(closed).model),
    inline("#wrapper", seen.wrapper),
    inline(`#${DatePicker.triggerId("due")}`, seen.trigger),
    inline("#backdrop", seen.backdrop),
    inline("#due-popover-panel", seen.panel),
    Scene.Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover()),
    Scene.Mount.resolve(
      Popover.PortalPopoverBackdrop,
      Popover.Message.CompletedPortalPopoverBackdrop(),
    ),
  );

  expect(sorted(seen.wrapper)).toEqual(sorted(wrapper));
  expect(sorted(seen.trigger)).toEqual(sorted(trigger));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
  expect(sorted(seen.panel)).toEqual(sorted(panel));
});
