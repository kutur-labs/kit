import type { HtmlBuilder } from "foldkit/html";

import { Combobox } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { childAttributes } from "foldkit/html";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { ComboboxStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isClosed: { opacity: 0 },
  isDisabled: { cursor: "not-allowed" },
  isReadOnly: { fontStyle: "italic" },
  isInvalid: { outlineColor: "red" },
  isActive: { backgroundColor: "gainsboro" },
  isSelected: { textDecorationLine: "underline" },
  itemDisabled: { opacity: 0.5 },
  itemReadOnly: { fontStyle: "italic" },
  inputWrapper: { display: "flex" },
  scroll: { overflowY: "auto" },
  heading: { fontSize: 12 },
  backdrop: { backgroundColor: "black" },
  group: { paddingBlock: 4 },
  separator: { blockSize: 1 },
  above: { zIndex: 20 },
});

// Every part @foldkit/ui sets state hooks on takes every flag, so each test can check a flag on
// each element that carries its hook.
const flagged = (state: ComboboxStyle.State) => [
  state.isVisible && styles.isVisible,
  state.isClosed && styles.isClosed,
  state.isDisabled && styles.isDisabled,
  state.isReadOnly && styles.isReadOnly,
  state.isInvalid && styles.isInvalid,
];

const comboStyles = {
  wrapper: flagged,
  inputWrapper: styles.inputWrapper,
  input: flagged,
  button: flagged,
  items: flagged,
  itemsScroll: styles.scroll,
  heading: styles.heading,
  backdrop: styles.backdrop,
  group: styles.group,
  separator: styles.separator,
  item: (state: ComboboxStyle.ItemState) => [
    state.isActive && styles.isActive,
    state.isSelected && styles.isSelected,
    state.isDisabled && styles.itemDisabled,
    state.isReadOnly && styles.itemReadOnly,
  ],
} satisfies ComboboxStyle.Styles;

type City = "waw" | "krk" | "gdn";

const Cities = Combobox.create<City>();

const citiesView = ComboboxStyle.view(Cities.view, comboStyles);

type Flags = Readonly<{ isDisabled: boolean; isReadOnly: boolean; isInvalid: boolean }>;

type Model = Readonly<{ combobox: Combobox.Model; flags: Flags }>;

const viewWith =
  (styledView: typeof citiesView) => (model: Model, h: HtmlBuilder<Combobox.Message>) =>
    styledView(
      model.combobox,
      {
        ...model.flags,
        items: ["waw", "krk", "gdn"],
        maybeSelectedValue: Option.some("krk"),
        restingInputValue: "",
        itemToValue: (city) => city,
        itemToDisplayText: (city) => city,
        isItemDisabled: (city) => city === "gdn",
        itemGroupKey: (city) => (city === "gdn" ? "Coast" : "Inland"),
        groupToHeading: (group) => ({ content: h.span([], [group]) }),
        attributes: childAttributes([h.Id("city")]),
        buttonContent: h.span([], ["Cities"]),
        itemToConfig: (city) => ({ content: h.span([], [city]) }),
      },
      h,
    );

const view = viewWith(citiesView);

const update = (model: Model, message: Combobox.Message) => ({
  model: { ...model, combobox: Cities.update(model.combobox, message).model },
});

const unset: Flags = { isDisabled: false, isReadOnly: false, isInvalid: false };

const closed = Combobox.init({ id: "city", isAnimated: true });

const open = Cities.update(
  closed,
  Combobox.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
).model;

const at = (transitionState: Combobox.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...open,
  isOpen,
  animation: { ...open.animation, transitionState },
});

// The Mounts Scene requires resolved: the toggle button's always, the panel's while it renders.
const buttonMount = Scene.Mount.resolve(
  Combobox.AttachComboboxPreventBlur,
  Combobox.Message.CompletedAttachComboboxPreventBlur(),
);

const panelMounts = [
  Scene.Mount.resolve(Combobox.AnchorCombobox, Combobox.Message.CompletedAnchorCombobox()),
  Scene.Mount.resolve(
    Combobox.PortalComboboxBackdrop,
    Combobox.Message.CompletedPortalComboboxBackdrop(),
  ),
];

const mounts = [buttonMount, ...panelMounts];

const wrapper = Scene.selector("#city");

const input = Scene.selector("#city-input");

const button = Scene.selector("#city-button");

const items = Scene.selector("#city-items");

const item = (index: number) => Scene.selector(`#city-item-${index}`);

describe("ComboboxStyle.view", () => {
  const scenarios = [
    { name: "closed", combobox: closed, isVisible: false, isClosed: false },
    { name: "open", combobox: at("Idle", true), isVisible: true, isClosed: false },
    { name: "EnterStart", combobox: at("EnterStart", true), isVisible: true, isClosed: true },
    {
      name: "EnterAnimating",
      combobox: at("EnterAnimating", true),
      isVisible: true,
      isClosed: false,
    },
    { name: "LeaveStart", combobox: at("LeaveStart", false), isVisible: true, isClosed: false },
    {
      name: "LeaveAnimating",
      combobox: at("LeaveAnimating", false),
      isVisible: true,
      isClosed: true,
    },
  ];

  for (const { name, combobox, isVisible, isClosed } of scenarios) {
    it(`sets isVisible and isClosed where @foldkit/ui sets data-open and data-closed: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ combobox, flags: unset }),
        ...agrees(wrapper, "data-open", styles.isVisible, isVisible),
        ...agrees(input, "data-open", styles.isVisible, isVisible),
        ...(isVisible
          ? [...agrees(items, "data-closed", styles.isClosed, isClosed), ...mounts]
          : [buttonMount]),
      );
    });
  }

  for (const flags of [
    unset,
    { ...unset, isDisabled: true },
    { ...unset, isReadOnly: true },
    { ...unset, isInvalid: true },
  ]) {
    it(`sets each input flag where @foldkit/ui sets its hook: ${JSON.stringify(flags)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ combobox: open, flags }),
        ...[wrapper, input, button].flatMap((element) => [
          ...agrees(element, "data-disabled", styles.isDisabled, flags.isDisabled),
          ...agrees(element, "data-readonly", styles.isReadOnly, flags.isReadOnly),
        ]),
        ...[wrapper, input].flatMap((element) =>
          agrees(element, "data-invalid", styles.isInvalid, flags.isInvalid),
        ),
        ...agrees(items, "data-readonly", styles.isReadOnly, flags.isReadOnly),
        ...mounts,
      );
    });
  }

  for (const isReadOnly of [false, true]) {
    it(`sets each item's flags where @foldkit/ui sets its hooks, read-only: ${isReadOnly}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ combobox: open, flags: { ...unset, isReadOnly } }),
        ...agrees(item(0), "data-active", styles.isActive, true),
        ...agrees(item(1), "data-active", styles.isActive, false),
        ...agrees(item(1), "data-selected", styles.isSelected, true),
        ...agrees(item(0), "data-selected", styles.isSelected, false),
        ...agrees(item(2), "data-disabled", styles.itemDisabled, true),
        ...agrees(item(0), "data-disabled", styles.itemDisabled, false),
        ...agrees(item(0), "data-readonly", styles.itemReadOnly, isReadOnly),
        ...mounts,
      );
    });
  }

  it("puts the functional CSS and each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given({ combobox: open, flags: unset }),
      ...hasStyles(wrapper, anchored.wrapper),
      ...hasStyles(Scene.selector("#city-input-wrapper"), styles.inputWrapper),
      ...hasStyles(items, anchored.panel),
      ...hasStyles(Scene.selector(`.${classOf(styles.backdrop)}`), anchored.backdrop),
      Scene.expect(Scene.selector(`#city-items .${classOf(styles.group)}`)).toExist(),
      Scene.expect(Scene.selector(`#city-items .${classOf(styles.separator)}`)).toExist(),
      Scene.expect(Scene.selector(`#city-items .${classOf(styles.scroll)}`)).toExist(),
      Scene.expect(Scene.selector(`#city-items .${classOf(styles.heading)}`)).toHaveText("Inland"),
      ...mounts,
    );
  });

  it("lets the app's z-index replace the items panel's default", () => {
    Scene.scene(
      { update, view: viewWith(ComboboxStyle.view(Cities.view, { items: styles.above })) },
      Scene.given({ combobox: open, flags: unset }),
      ...hasStyles(items, styles.above),
      Scene.expect(items).not.toHaveClass(classOf(anchored.panel)),
      ...mounts,
    );
  });

  it("still opens and highlights the first item on ArrowDown in the styled input", () => {
    Scene.scene(
      { update, view },
      Scene.given({ combobox: closed, flags: unset }),
      buttonMount,
      Scene.keydown(input, "ArrowDown"),
      ...agrees(input, "data-open", styles.isVisible, true),
      ...agrees(item(0), "data-active", styles.isActive, true),
      ...hasStyles(items, anchored.panel),
      ...panelMounts,
    );
  });
});

describe("@foldkit/ui defects ComboboxStyle works around", () => {
  it("F4: the backdrop has no inline cover and the items panel no z-index", () => {
    Scene.scene(
      { update, view },
      Scene.given({ combobox: open, flags: unset }),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, `.${classOf(styles.backdrop)}`),
          "@foldkit/ui now covers the viewport with Combobox's backdrop inline (F4). Drop anchored.backdrop from internal/combobox.ts, and from functional-styles.ts once no module uses it; type Combobox's backdrop with an Inline family in owned.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("position");

        expect(
          Scene.find(simulation.html, "#city-items"),
          "@foldkit/ui now sets Combobox's items z-index inline (F4). Drop anchored.panel from internal/combobox.ts, and from functional-styles.ts once no module uses it; update the README's What the package sets table. The inline drift test then asks for zIndex in the items' owned family.",
        ).not.toHaveStyle("z-index");
      }),
      ...mounts,
    );
  });
});

describe("ComboboxStyle.Multi.view", () => {
  const Tags = Combobox.Multi.create<City>();

  const tagsView = ComboboxStyle.Multi.view(Tags.view, comboStyles);

  const multiView = (model: Combobox.Multi.Model, h: HtmlBuilder<Combobox.Message>) =>
    tagsView(
      model,
      {
        items: ["waw", "krk", "gdn"],
        selectedValues: ["waw", "gdn"],
        restingInputValue: "",
        itemToValue: (city) => city,
        itemToDisplayText: (city) => city,
        itemToConfig: (city) => ({ content: h.span([], [city]) }),
        // Groups without headings.
        itemGroupKey: () => "Cities",
      },
      h,
    );

  it("sets each flag where @foldkit/ui sets its hook, input flags left unset", () => {
    const multiOpen = Tags.update(
      Combobox.Multi.init({ id: "city" }),
      Combobox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
    ).model;

    Scene.scene(
      {
        update: (model: Combobox.Multi.Model, message: Combobox.Message) =>
          Tags.update(model, message),
        view: multiView,
      },
      Scene.given(multiOpen),
      ...agrees(input, "data-open", styles.isVisible, true),
      ...agrees(item(0), "data-selected", styles.isSelected, true),
      ...agrees(item(1), "data-selected", styles.isSelected, false),
      ...agrees(item(2), "data-selected", styles.isSelected, true),
      ...agrees(input, "data-disabled", styles.isDisabled, false),
      ...agrees(input, "data-readonly", styles.isReadOnly, false),
      ...agrees(input, "data-invalid", styles.isInvalid, false),
      ...panelMounts,
    );
  });
});
