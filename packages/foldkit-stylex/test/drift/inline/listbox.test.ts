import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Listbox's open trigger and items own, and nothing on its wrapper and backdrop", () => {
  const button = owns<Own.Owns["Listbox"]["button"]>()("position", "zIndex");
  const items = owns<Own.Owns["Listbox"]["items"]>()("position", "margin", "visibility");
  // This package sets what the wrapper and backdrop own.
  const wrapper = owns<Own.Owns["Listbox"]["wrapper"]>()();
  const backdrop = owns<Own.Owns["Listbox"]["backdrop"]>()();

  const seen = {
    button: new Set<string>(),
    items: new Set<string>(),
    wrapper: new Set<string>(),
    backdrop: new Set<string>(),
  };

  const Languages = Listbox.create<"pl">();

  const open = Languages.update(
    Listbox.init({ id: "language" }),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model;

  Scene.scene(
    {
      update: (model: Listbox.Model) => ({ model }),
      view: (model: Listbox.Model, h: HtmlBuilder<Listbox.Message>) =>
        Languages.view(
          model,
          {
            items: ["pl"],
            maybeSelectedValue: Option.none(),
            buttonContent: h.span([], []),
            itemToConfig: () => ({ content: h.span([], []) }),
            // Class names only to find each part; the styled view fills them from styles.
            className: "wrapper",
            backdropClassName: "backdrop",
          },
          h,
        ),
    },
    Scene.given(open),
    inline("#language-button", seen.button),
    inline("#language-items", seen.items),
    inline(".wrapper", seen.wrapper),
    inline(".backdrop", seen.backdrop),
    Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
    Scene.Mount.resolve(
      Listbox.PortalListboxBackdrop,
      Listbox.Message.CompletedPortalListboxBackdrop(),
    ),
  );

  expect(sorted(seen.button)).toEqual(sorted(button));
  expect(sorted(seen.items)).toEqual(sorted(items));
  expect(sorted(seen.wrapper)).toEqual(sorted(wrapper));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
});
