import type { HtmlBuilder } from "foldkit/html";

import { Popover } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { PopoverStyle } from "../../src/index.ts";
import { anchored } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isDisabled: { opacity: 0.5 },
  isClosed: { scale: 0.95 },
  panel: { padding: 16 },
  backdrop: { backgroundColor: "black" },
  arrow: { inlineSize: 16 },
  wrapper: { display: "inline-block" },
  above: { zIndex: 20 },
});

const popoverView = PopoverStyle.view(Popover.view, {
  button: (state) => [state.isVisible && styles.isVisible, state.isDisabled && styles.isDisabled],
  panel: (state) => [styles.panel, state.isClosed && styles.isClosed],
  backdrop: styles.backdrop,
  arrow: styles.arrow,
  wrapper: styles.wrapper,
});

// The optional inputs this test varies, left out where it checks their defaults.
type Model = Readonly<{ popover: Popover.Model; inputs: Pick<Popover.ViewInputs, "isDisabled"> }>;

const viewWith =
  (styledView: typeof popoverView) => (model: Model, h: HtmlBuilder<Popover.Message>) =>
    styledView(
      model.popover,
      {
        ...model.inputs,
        anchor: { placement: "bottom" },
        toView: ({ wrapper, button, panel, backdrop, arrow, isVisible }) =>
          h.div(
            [...wrapper, h.Id("wrapper")],
            [
              h.button([...button], ["Details"]),
              ...(isVisible
                ? [h.div([...backdrop, h.Id("backdrop")]), h.div([...panel], [h.div([...arrow])])]
                : []),
            ],
          ),
      },
      h,
    );

const view = viewWith(popoverView);

const update = (model: Model, message: Popover.Message) => ({
  model: { ...model, popover: Popover.update(model.popover, message).model },
});

const closed = Popover.init({ id: "help", isAnimated: true });

const open = Popover.update(closed, Popover.Message.RequestedOpen()).model;

const at = (transitionState: Popover.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...open,
  isOpen,
  animation: { ...open.animation, transitionState },
});

// The panel's Mounts, which Scene requires resolved whenever the panel renders.
const mounts = [
  Scene.Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover()),
  Scene.Mount.resolve(
    Popover.PortalPopoverBackdrop,
    Popover.Message.CompletedPortalPopoverBackdrop(),
  ),
];

const button = Scene.selector("#help-button");

const panel = Scene.selector("#help-panel");

describe("PopoverStyle.view", () => {
  const scenarios = [
    { name: "closed", popover: closed, isVisible: false, isClosed: false },
    { name: "open", popover: at("Idle", true), isVisible: true, isClosed: false },
    { name: "EnterStart", popover: at("EnterStart", true), isVisible: true, isClosed: true },
    {
      name: "EnterAnimating",
      popover: at("EnterAnimating", true),
      isVisible: true,
      isClosed: false,
    },
    { name: "LeaveStart", popover: at("LeaveStart", false), isVisible: true, isClosed: false },
    {
      name: "LeaveAnimating",
      popover: at("LeaveAnimating", false),
      isVisible: true,
      isClosed: true,
    },
  ];

  for (const { name, popover, isVisible, isClosed } of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ popover, inputs: {} }),
        ...agrees(button, "data-open", styles.isVisible, isVisible),
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
        Scene.given({ popover: closed, inputs }),
        ...agrees(button, "data-disabled", styles.isDisabled, inputs.isDisabled === true),
      );
    });
  }

  it("puts the functional CSS and each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given({ popover: open, inputs: {} }),
      ...hasStyles(Scene.selector("#wrapper"), anchored.wrapper, styles.wrapper),
      ...hasStyles(panel, anchored.panel, styles.panel),
      Scene.expect(panel).toHaveStyle("position", "absolute"),
      ...hasStyles(Scene.selector("#backdrop"), anchored.backdrop, styles.backdrop),
      ...hasStyles(Scene.selector("#help-arrow"), anchored.arrow, styles.arrow),
      ...mounts,
    );
  });

  it("lets the app's z-index replace the panel's default", () => {
    Scene.scene(
      { update, view: viewWith(PopoverStyle.view(Popover.view, { panel: styles.above })) },
      Scene.given({ popover: open, inputs: {} }),
      ...hasStyles(panel, styles.above),
      Scene.expect(panel).not.toHaveClass(classOf(anchored.panel)),
      ...mounts,
    );
  });

  it("still opens from a click on the styled button", () => {
    Scene.scene(
      { update, view },
      Scene.given({ popover: closed, inputs: {} }),
      Scene.click(button),
      Scene.expect(button).toHaveAttr("data-open"),
      Scene.expect(button).toHaveClass(classOf(styles.isVisible)),
      ...mounts,
    );
  });
});

describe("@foldkit/ui defects PopoverStyle works around", () => {
  it("the backdrop has no inline cover and the panel no z-index", () => {
    Scene.scene(
      { update, view },
      Scene.given({ popover: open, inputs: {} }),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, "#backdrop"),
          "@foldkit/ui now covers the viewport with Popover's backdrop inline. Drop anchored.backdrop from popover-style.ts, and from functional-styles.ts once no module uses it; map Popover's backdrop to an Inline family in Owns in src/internal/owned.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("position");

        expect(
          Scene.find(simulation.html, "#help-panel"),
          "@foldkit/ui now sets Popover's panel z-index inline. Drop anchored.panel from popover-style.ts, and from functional-styles.ts once no module uses it; update the README's What the package sets table. The inline drift test then asks for zIndex among the properties @foldkit/ui writes in the panel's family.",
        ).not.toHaveStyle("z-index");
      }),
      ...mounts,
    );
  });
});
