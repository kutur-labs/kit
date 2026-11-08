import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Combobox } from "@foldkit/ui";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Combobox's items own, and nothing on its other parts", () => {
  const items = owns<Own.Owns["Combobox"]["items"]>()("position", "margin", "visibility");
  // This package sets what the wrapper and backdrop own.
  const wrapper = owns<Own.Owns["Combobox"]["wrapper"]>()();
  const backdrop = owns<Own.Owns["Combobox"]["backdrop"]>()();

  const seen = {
    items: new Set<string>(),
    wrapper: new Set<string>(),
    backdrop: new Set<string>(),
    rest: new Set<string>(),
  };

  const Cities = Combobox.create<"waw" | "krk">();

  const open = Cities.update(
    Combobox.init({ id: "city" }),
    Combobox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model;

  // Class names only to find each part; the styled view fills them from styles. The button, open
  // or not, is among them: unlike Listbox's, it is not lifted.
  const rest = [
    "input-wrapper",
    "input",
    "button",
    "scroll",
    "item",
    "group",
    "heading",
    "separator",
  ];

  Scene.scene(
    {
      update: (model: Combobox.Model) => ({ model }),
      view: (model: Combobox.Model, h: HtmlBuilder<Combobox.Message>) =>
        Cities.view(
          model,
          {
            items: ["waw", "krk"],
            maybeSelectedValue: Option.none(),
            restingInputValue: "",
            itemToValue: (city) => city,
            itemToDisplayText: (city) => city,
            buttonContent: h.span([], []),
            className: "wrapper",
            inputWrapperClassName: "input-wrapper",
            inputClassName: "input",
            buttonClassName: "button",
            backdropClassName: "backdrop",
            itemsScrollClassName: "scroll",
            groupClassName: "group",
            separatorClassName: "separator",
            itemGroupKey: (city) => city,
            groupToHeading: () => ({ content: h.span([], []), className: "heading" }),
            itemToConfig: () => ({ content: h.span([], []), className: "item" }),
          },
          h,
        ),
    },
    Scene.given(open),
    inline("#city-items", seen.items),
    inline(".wrapper", seen.wrapper),
    inline(".backdrop", seen.backdrop),
    ...rest.map((part) => inline(`.${part}`, seen.rest)),
    Scene.Mount.resolve(
      Combobox.AttachComboboxPreventBlur,
      Combobox.Message.CompletedAttachComboboxPreventBlur(),
    ),
    Scene.Mount.resolve(Combobox.AnchorCombobox, Combobox.Message.CompletedAnchorCombobox()),
    Scene.Mount.resolve(
      Combobox.PortalComboboxBackdrop,
      Combobox.Message.CompletedPortalComboboxBackdrop(),
    ),
  );

  expect(sorted(seen.items)).toEqual(sorted(items));
  expect(sorted(seen.wrapper)).toEqual(sorted(wrapper));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
  expect(sorted(seen.rest)).toEqual([]);
});
