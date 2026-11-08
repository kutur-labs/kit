import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Menu's open trigger and items own, and nothing on its other parts", () => {
  const button = owns<Own.Owns["Menu"]["button"]>()("position", "zIndex");
  const items = owns<Own.Owns["Menu"]["items"]>()("position", "margin", "visibility");
  // This package sets what the wrapper and backdrop own.
  const wrapper = owns<Own.Owns["Menu"]["wrapper"]>()();
  const backdrop = owns<Own.Owns["Menu"]["backdrop"]>()();

  const seen = {
    button: new Set<string>(),
    items: new Set<string>(),
    wrapper: new Set<string>(),
    backdrop: new Set<string>(),
    rest: new Set<string>(),
  };

  const Actions = Menu.create<"copy" | "paste">();

  const open = Actions.update(
    Menu.init({ id: "actions" }),
    Menu.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model;

  // Class names only to find each part; the styled view fills them from styles.
  const rest = ["scroll", "item", "group", "heading", "separator"];

  Scene.scene(
    {
      update: (model: Menu.Model) => ({ model }),
      view: (model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
        Actions.view(
          model,
          {
            items: ["copy", "paste"],
            buttonContent: h.span([], []),
            className: "wrapper",
            backdropClassName: "backdrop",
            itemsScrollClassName: "scroll",
            groupClassName: "group",
            separatorClassName: "separator",
            itemGroupKey: (item) => item,
            groupToHeading: () => ({ content: h.span([], []), className: "heading" }),
            itemToConfig: () => ({ content: h.span([], []), className: "item" }),
          },
          h,
        ),
    },
    Scene.given(open),
    inline("#actions-button", seen.button),
    inline("#actions-items", seen.items),
    inline(".wrapper", seen.wrapper),
    inline(".backdrop", seen.backdrop),
    ...rest.map((part) => inline(`.${part}`, seen.rest)),
    Scene.Mount.resolve(Menu.AnchorMenu, Menu.Message.CompletedAnchorMenu()),
    Scene.Mount.resolve(Menu.PortalMenuBackdrop, Menu.Message.CompletedPortalMenuBackdrop()),
  );

  expect(sorted(seen.button)).toEqual(sorted(button));
  expect(sorted(seen.items)).toEqual(sorted(items));
  expect(sorted(seen.wrapper)).toEqual(sorted(wrapper));
  expect(sorted(seen.backdrop)).toEqual(sorted(backdrop));
  expect(sorted(seen.rest)).toEqual([]);
});
