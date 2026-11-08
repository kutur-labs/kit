import type { SxStyles } from "../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Menu } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { MenuStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  wrapperVisible: { outlineStyle: "solid" },
  isClosed: { opacity: 0 },
  isButtonDisabled: { cursor: "not-allowed" },
  isActive: { backgroundColor: "gainsboro" },
  itemDisabled: { textDecorationLine: "line-through" },
  scroll: { overflowY: "auto" },
  heading: { fontSize: 12 },
  wrapper: { display: "inline-block" },
  backdrop: { backgroundColor: "black" },
  group: { paddingBlock: 4 },
  separator: { blockSize: 1 },
  above: { zIndex: 20 },
});

const menuStyles = {
  wrapper: (state: MenuStyle.State) => [styles.wrapper, state.isVisible && styles.wrapperVisible],
  button: (state: MenuStyle.State) => [
    state.isVisible && styles.isVisible,
    state.isButtonDisabled && styles.isButtonDisabled,
  ],
  items: (state: MenuStyle.State) => state.isClosed && styles.isClosed,
  itemsScroll: styles.scroll,
  heading: styles.heading,
  backdrop: styles.backdrop,
  group: styles.group,
  separator: styles.separator,
  item: (state: MenuStyle.ItemState) => [
    state.isActive && styles.isActive,
    state.isDisabled && styles.itemDisabled,
  ],
} satisfies MenuStyle.Styles;

type Action = "copy" | "paste" | "delete";

const Actions = Menu.create<Action>();

const actionsView = MenuStyle.view(Actions.view, menuStyles);

// `isButtonDisabled` is left out where the test checks its default.
type Model = Readonly<{
  menu: Menu.Model;
  selected: Action | "";
  inputs: Pick<Menu.ViewInputs<Action>, "isButtonDisabled">;
}>;

const viewWith = (styledView: typeof actionsView) => (model: Model, h: HtmlBuilder<Menu.Message>) =>
  h.div(
    [],
    [
      styledView(
        model.menu,
        {
          ...model.inputs,
          items: ["copy", "paste", "delete"],
          isItemDisabled: (item) => item === "delete",
          itemGroupKey: (item) => (item === "delete" ? "Danger" : "Edit"),
          groupToHeading: (group) => ({ content: h.span([], [group]) }),
          buttonContent: h.span([], ["Actions"]),
          itemToConfig: (item) => ({ content: h.span([], [item]) }),
        },
        h,
      ),
      h.output([h.Id("selected")], [model.selected]),
    ],
  );

const view = viewWith(actionsView);

const update = (model: Model, message: Menu.Message) => {
  const next = Actions.update(model.menu, message);

  return {
    model: { ...model, menu: next.model, selected: next.outMessage?.value ?? model.selected },
  };
};

const closed = Menu.init({ id: "actions", isAnimated: true });

const open = Actions.update(
  closed,
  Menu.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
).model;

const at = (transitionState: Menu.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...open,
  isOpen,
  animation: { ...open.animation, transitionState },
});

const given = (menu: Menu.Model, inputs: Model["inputs"] = {}) =>
  Scene.given<Model>({ menu, selected: "", inputs });

// The menu's Mounts, which Scene requires resolved whenever the items render.
const mounts = [
  Scene.Mount.resolve(Menu.AnchorMenu, Menu.Message.CompletedAnchorMenu()),
  Scene.Mount.resolve(Menu.PortalMenuBackdrop, Menu.Message.CompletedPortalMenuBackdrop()),
];

const wrapper = Scene.selector(`.${classOf(anchored.wrapper)}`);

const button = Scene.selector("#actions-button");

const items = Scene.selector("#actions-items");

const item = (index: number) => Scene.selector(`#actions-item-${index}`);

describe("MenuStyle.view", () => {
  const scenarios = [
    { name: "closed", menu: closed, isVisible: false, isClosed: false },
    { name: "open", menu: at("Idle", true), isVisible: true, isClosed: false },
    { name: "EnterStart", menu: at("EnterStart", true), isVisible: true, isClosed: true },
    { name: "EnterAnimating", menu: at("EnterAnimating", true), isVisible: true, isClosed: false },
    { name: "LeaveStart", menu: at("LeaveStart", false), isVisible: true, isClosed: false },
    { name: "LeaveAnimating", menu: at("LeaveAnimating", false), isVisible: true, isClosed: true },
  ];

  for (const { name, menu, isVisible, isClosed } of scenarios) {
    it(`sets isVisible and isClosed where @foldkit/ui sets data-open and data-closed: ${name}`, () => {
      Scene.scene(
        { update, view },
        given(menu),
        ...agrees(wrapper, "data-open", styles.wrapperVisible, isVisible),
        ...agrees(button, "data-open", styles.isVisible, isVisible),
        ...(isVisible
          ? [...agrees(items, "data-closed", styles.isClosed, isClosed), ...mounts]
          : []),
      );
    });
  }

  for (const inputs of [{}, { isButtonDisabled: false }, { isButtonDisabled: true }]) {
    it(`sets isButtonDisabled where @foldkit/ui sets data-disabled: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        given(closed, inputs),
        ...agrees(
          button,
          "data-disabled",
          styles.isButtonDisabled,
          inputs.isButtonDisabled ?? false,
        ),
      );
    });
  }

  it("sets each item's flags where @foldkit/ui sets its hooks", () => {
    Scene.scene(
      { update, view },
      given(open),
      ...agrees(item(0), "data-active", styles.isActive, true),
      ...agrees(item(1), "data-active", styles.isActive, false),
      ...agrees(item(2), "data-disabled", styles.itemDisabled, true),
      ...agrees(item(0), "data-disabled", styles.itemDisabled, false),
      ...mounts,
    );
  });

  it("puts the functional CSS and each part's styles on its element", () => {
    const within = (part: SxStyles, inner: string) =>
      Scene.expect(Scene.selector(`.${classOf(part).split(" ").join(".")} ${inner}`)).toExist();

    Scene.scene(
      { update, view },
      given(open),
      ...hasStyles(items, anchored.panel),
      within([anchored.wrapper, styles.wrapper], "#actions-button"),
      within(styles.group, "#actions-item-0"),
      Scene.expect(Scene.selector(`.${classOf(styles.separator)}`)).toExist(),
      ...hasStyles(Scene.selector(`.${classOf(styles.backdrop)}`), anchored.backdrop),
      Scene.expect(Scene.selector(`#actions-items .${classOf(styles.scroll)}`)).toExist(),
      Scene.expect(Scene.selector(`#actions-items .${classOf(styles.heading)}`)).toHaveText("Edit"),
      ...mounts,
    );
  });

  it("lets the app's z-index replace the items panel's default", () => {
    Scene.scene(
      { update, view: viewWith(MenuStyle.view(Actions.view, { items: styles.above })) },
      given(open),
      ...hasStyles(items, styles.above),
      Scene.expect(items).not.toHaveClass(classOf(anchored.panel)),
      ...mounts,
    );
  });

  it("still opens from a click on the styled button, and a clicked item selects and closes", () => {
    Scene.scene(
      { update, view },
      given(closed),
      Scene.click(button),
      ...agrees(button, "data-open", styles.isVisible, true),
      ...hasStyles(items, anchored.panel),
      ...mounts,
      Scene.click(item(1)),
      Scene.expect(items).toHaveAttr("data-leave"),
      Scene.expect(Scene.selector("#selected")).toHaveText("paste"),
    );
  });
});

describe("@foldkit/ui defects MenuStyle works around", () => {
  it("F4: the backdrop has no inline cover and the items panel no z-index", () => {
    Scene.scene(
      { update, view },
      given(open),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, `.${classOf(styles.backdrop)}`),
          "@foldkit/ui now covers the viewport with Menu's backdrop inline (F4). Drop anchored.backdrop from menu-style.ts, and from functional-styles.ts once no module uses it; type Menu's backdrop with an Inline family in owned.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("position");

        expect(
          Scene.find(simulation.html, "#actions-items"),
          "@foldkit/ui now sets Menu's items z-index inline (F4). Drop anchored.panel from menu-style.ts, and from functional-styles.ts once no module uses it; update the README's What the package sets table. The inline drift test then asks for zIndex in the items' owned family.",
        ).not.toHaveStyle("z-index");
      }),
      ...mounts,
    );
  });
});
