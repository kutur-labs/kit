import type { SxStyles } from "../../src/index.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { ListboxStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isClosed: { opacity: 0 },
  isDisabled: { cursor: "not-allowed" },
  isReadOnly: { cursor: "default" },
  isInvalid: { outlineColor: "red" },
  isActive: { backgroundColor: "gainsboro" },
  isSelected: { textDecorationLine: "underline" },
  itemDisabled: { opacity: 0.5 },
  itemReadOnly: { fontStyle: "italic" },
  scroll: { overflowY: "auto" },
  heading: { fontSize: 12 },
  wrapper: { display: "inline-block" },
  wrapperDisabled: { outlineStyle: "dashed" },
  backdrop: { backgroundColor: "black" },
  group: { paddingBlock: 4 },
  separator: { blockSize: 1 },
  above: { zIndex: 20 },
});

const listStyles = {
  button: (state: ListboxStyle.State) => [
    state.isVisible && styles.isVisible,
    state.isDisabled && styles.isDisabled,
    state.isReadOnly && styles.isReadOnly,
    state.isInvalid && styles.isInvalid,
  ],
  items: (state: ListboxStyle.State) => state.isClosed && styles.isClosed,
  itemsScroll: styles.scroll,
  heading: styles.heading,
  wrapper: (state: ListboxStyle.State) => [
    styles.wrapper,
    state.isDisabled && styles.wrapperDisabled,
  ],
  backdrop: styles.backdrop,
  group: styles.group,
  separator: styles.separator,
  item: (state: ListboxStyle.ItemState) => [
    state.isActive && styles.isActive,
    state.isSelected && styles.isSelected,
    state.isDisabled && styles.itemDisabled,
    state.isReadOnly && styles.itemReadOnly,
  ],
} satisfies ListboxStyle.Styles;

type Language = "pl" | "en" | "de";

const Languages = Listbox.create<Language>();

const languagesView = ListboxStyle.view(Languages.view, listStyles);

type Flags = Readonly<{
  isDisabled: boolean;
  isButtonDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
}>;

type Model = Readonly<{ listbox: Listbox.Model; flags: Flags }>;

const viewWith =
  (styledView: typeof languagesView) => (model: Model, h: HtmlBuilder<Listbox.Message>) =>
    styledView(
      model.listbox,
      {
        ...model.flags,
        items: ["pl", "en", "de"],
        maybeSelectedValue: Option.some("en"),
        isItemDisabled: (item) => item === "de",
        itemGroupKey: (item) => (item === "de" ? "Other" : "Languages"),
        groupToHeading: (group) => ({ content: h.span([], [group]) }),
        buttonContent: h.span([], ["Language"]),
        itemToConfig: (item) => ({ content: h.span([], [item]) }),
      },
      h,
    );

const view = viewWith(languagesView);

const update = (model: Model, message: Listbox.Message) => ({
  model: { ...model, listbox: Languages.update(model.listbox, message).model },
});

const unset: Flags = {
  isDisabled: false,
  isButtonDisabled: false,
  isReadOnly: false,
  isInvalid: false,
};

const closed = Listbox.init({ id: "language", isAnimated: true });

const open = Languages.update(
  closed,
  Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
).model;

const at = (transitionState: Listbox.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...open,
  isOpen,
  animation: { ...open.animation, transitionState },
});

// The list's Mounts, which Scene requires resolved whenever the list renders.
const mounts = [
  Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
  Scene.Mount.resolve(
    Listbox.PortalListboxBackdrop,
    Listbox.Message.CompletedPortalListboxBackdrop(),
  ),
];

const button = Scene.selector("#language-button");

const wrapper = Scene.selector(`.${classOf(styles.wrapper)}`);

const items = Scene.selector("#language-items");

const item = (index: number) => Scene.selector(`#language-item-${index}`);

describe("ListboxStyle.view", () => {
  const scenarios = [
    { name: "closed", listbox: closed, isVisible: false, isClosed: false },
    { name: "open", listbox: at("Idle", true), isVisible: true, isClosed: false },
    { name: "EnterStart", listbox: at("EnterStart", true), isVisible: true, isClosed: true },
    {
      name: "EnterAnimating",
      listbox: at("EnterAnimating", true),
      isVisible: true,
      isClosed: false,
    },
    { name: "LeaveStart", listbox: at("LeaveStart", false), isVisible: true, isClosed: false },
    {
      name: "LeaveAnimating",
      listbox: at("LeaveAnimating", false),
      isVisible: true,
      isClosed: true,
    },
  ];

  for (const { name, listbox, isVisible, isClosed } of scenarios) {
    it(`sets isVisible and isClosed where @foldkit/ui sets data-open and data-closed: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ listbox, flags: unset }),
        ...agrees(button, "data-open", styles.isVisible, isVisible),
        ...(isVisible
          ? [...agrees(items, "data-closed", styles.isClosed, isClosed), ...mounts]
          : []),
      );
    });
  }

  for (const flags of [
    unset,
    { ...unset, isDisabled: true },
    { ...unset, isButtonDisabled: true },
    { ...unset, isReadOnly: true },
    { ...unset, isInvalid: true },
  ]) {
    it(`sets each input flag where @foldkit/ui sets its hook: ${JSON.stringify(flags)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ listbox: closed, flags }),
        ...agrees(wrapper, "data-disabled", styles.wrapperDisabled, flags.isDisabled),
        ...agrees(
          button,
          "data-disabled",
          styles.isDisabled,
          flags.isDisabled || flags.isButtonDisabled,
        ),
        ...agrees(button, "data-readonly", styles.isReadOnly, flags.isReadOnly),
        ...agrees(button, "data-invalid", styles.isInvalid, flags.isInvalid),
      );
    });
  }

  for (const isReadOnly of [false, true]) {
    it(`sets each item's flags where @foldkit/ui sets its hooks, read-only: ${isReadOnly}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ listbox: open, flags: { ...unset, isReadOnly } }),
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
    const within = (part: SxStyles, inner: string) =>
      Scene.expect(Scene.selector(`.${classOf(part).split(" ").join(".")} ${inner}`)).toExist();

    Scene.scene(
      { update, view },
      Scene.given({ listbox: open, flags: unset }),
      ...hasStyles(items, anchored.panel),
      within([anchored.wrapper, styles.wrapper], "#language-button"),
      within(styles.group, "#language-item-0"),
      Scene.expect(Scene.selector(`.${classOf(styles.separator)}`)).toExist(),
      ...hasStyles(Scene.selector(`.${classOf(styles.backdrop)}`), anchored.backdrop),
      Scene.expect(Scene.selector(`#language-items .${classOf(styles.scroll)}`)).toExist(),
      Scene.expect(Scene.selector(`#language-items .${classOf(styles.heading)}`)).toHaveText(
        "Languages",
      ),
      ...mounts,
    );
  });

  it("lets the app's z-index replace the items panel's default", () => {
    Scene.scene(
      { update, view: viewWith(ListboxStyle.view(Languages.view, { items: styles.above })) },
      Scene.given({ listbox: open, flags: unset }),
      ...hasStyles(items, styles.above),
      Scene.expect(items).not.toHaveClass(classOf(anchored.panel)),
      ...mounts,
    );
  });

  it("still opens from a click on the styled button", () => {
    Scene.scene(
      { update, view },
      Scene.given({ listbox: closed, flags: unset }),
      Scene.click(button),
      ...agrees(button, "data-open", styles.isVisible, true),
      ...hasStyles(items, anchored.panel),
      ...mounts,
    );
  });
});

describe("@foldkit/ui defects ListboxStyle works around", () => {
  it("the backdrop has no inline cover and the items panel no z-index", () => {
    Scene.scene(
      { update, view },
      Scene.given({ listbox: open, flags: unset }),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, `.${classOf(styles.backdrop)}`),
          "@foldkit/ui now covers the viewport with Listbox's backdrop inline. Drop anchored.backdrop from internal/listbox.ts, and from functional-styles.ts once no module uses it; map Listbox's backdrop to an Inline family in Owns in src/internal/owned.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("position");

        expect(
          Scene.find(simulation.html, "#language-items"),
          "@foldkit/ui now sets Listbox's items z-index inline. Drop anchored.panel from internal/listbox.ts, and from functional-styles.ts once no module uses it; update the README's What the package sets table. The inline drift test then asks for zIndex among the properties @foldkit/ui writes in the items' family.",
        ).not.toHaveStyle("z-index");
      }),
      ...mounts,
    );
  });

  it("the enter animation waits on an element Listbox does not render", () => {
    Scene.scene(
      { update, view },
      Scene.given({ listbox: at("EnterAnimating", true), flags: unset }),
      Scene.tap((simulation) => {
        expect(
          Option.isNone(Scene.find(simulation.html, `#${open.animation.id}`)),
          "@foldkit/ui now waits on Listbox's items element for its enter animation, so data-enter and data-transition last until the transition ends. Delete this test. Keep the README's advice to put transition* on the base style: every component's isClosed needs it, not only Listbox's.",
        ).toBe(true);
      }),
      ...mounts,
    );
  });
});

describe("ListboxStyle.Multi.view", () => {
  const Tags = Listbox.Multi.create<Language>();

  const tagsView = ListboxStyle.Multi.view(Tags.view, listStyles);

  const multiView = (model: Listbox.Multi.Model, h: HtmlBuilder<Listbox.Message>) =>
    tagsView(
      model,
      {
        items: ["pl", "en", "de"],
        selectedValues: ["pl", "de"],
        buttonContent: h.span([], ["Tags"]),
        itemToConfig: (tag) => ({ content: h.span([], [tag]) }),
        // Groups without headings.
        itemGroupKey: () => "Tags",
      },
      h,
    );

  it("sets each flag where @foldkit/ui sets its hook, input flags left unset", () => {
    const multiOpen = Tags.update(
      Listbox.Multi.init({ id: "language" }),
      Listbox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
    ).model;

    Scene.scene(
      {
        update: (model: Listbox.Multi.Model, message: Listbox.Message) =>
          Tags.update(model, message),
        view: multiView,
      },
      Scene.given(multiOpen),
      ...agrees(item(0), "data-selected", styles.isSelected, true),
      ...agrees(item(1), "data-selected", styles.isSelected, false),
      ...agrees(item(2), "data-selected", styles.isSelected, true),
      ...agrees(button, "data-disabled", styles.isDisabled, false),
      ...agrees(button, "data-readonly", styles.isReadOnly, false),
      ...agrees(button, "data-invalid", styles.isInvalid, false),
      ...mounts,
    );
  });
});
