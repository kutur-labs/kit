import type { HtmlBuilder } from "foldkit/html";

import { Dialog } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { DialogStyle } from "../../src/index.ts";
import { dialog } from "../../src/internal/functional-styles.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  isVisible: { fontWeight: 700 },
  isClosed: { opacity: 0 },
  grid: { display: "grid" },
  panel: { padding: 24 },
  title: { fontSize: 20 },
  description: { fontStyle: "italic" },
  closeButton: { minBlockSize: 44 },
  ink: { color: "black" },
  absolute: { position: "absolute" },
});

const dialogView = DialogStyle.view(Dialog.view, {
  dialog: (state) => [styles.grid, state.isVisible && styles.isVisible],
  backdrop: (state) => state.isClosed && styles.isClosed,
  panel: (state) => [styles.panel, state.isClosed && styles.isClosed],
  title: styles.title,
  description: styles.description,
  closeButton: styles.closeButton,
});

const viewWith =
  (styledView: typeof dialogView) => (model: Dialog.Model, h: HtmlBuilder<Dialog.Message>) =>
    styledView(
      model,
      {
        toView: ({
          dialog: element,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }) =>
          h.dialog(
            [...element],
            isVisible
              ? [
                  h.div([...backdrop, h.Id("backdrop")]),
                  h.div(
                    [...panel],
                    [
                      h.h2([...title], ["Delete the draft?"]),
                      h.p([...description], ["It cannot be restored."]),
                      h.button([...closeButton, h.Id("cancel")], ["Cancel"]),
                    ],
                  ),
                ]
              : [],
          ),
      },
      h,
    );

const view = viewWith(dialogView);

const update = (model: Dialog.Model, message: Dialog.Message) => ({
  model: Dialog.update(model, message).model,
});

const closed = Dialog.init({ id: "confirm", isAnimated: true });

const open = { ...closed, isOpen: true };

const at = (transitionState: Dialog.Model["animation"]["transitionState"], isOpen: boolean) => ({
  ...closed,
  isOpen,
  animation: { ...closed.animation, transitionState },
});

const acquired = Scene.Mount.resolve(
  Dialog.AcquireResources,
  Dialog.Message.SucceededAcquireResources(),
);

const element = Scene.selector("#confirm");

const backdrop = Scene.selector("#backdrop");

const panel = Scene.selector("#confirm-panel");

describe("DialogStyle.view", () => {
  const scenarios = [
    { name: "closed", model: closed, isVisible: false, isClosed: false },
    { name: "open", model: open, isVisible: true, isClosed: false },
    { name: "EnterStart", model: at("EnterStart", true), isVisible: true, isClosed: true },
    { name: "EnterAnimating", model: at("EnterAnimating", true), isVisible: true, isClosed: false },
    { name: "LeaveStart", model: at("LeaveStart", false), isVisible: true, isClosed: false },
    { name: "LeaveAnimating", model: at("LeaveAnimating", false), isVisible: true, isClosed: true },
  ];

  for (const { name, model, isVisible, isClosed } of scenarios) {
    it(`sets each flag where @foldkit/ui sets its hook: ${name}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(model),
        ...agrees(element, "data-open", styles.isVisible, isVisible),
        ...(isVisible
          ? [
              ...agrees(backdrop, "data-closed", styles.isClosed, isClosed),
              ...agrees(panel, "data-closed", styles.isClosed, isClosed),
              acquired,
            ]
          : []),
      );
    });
  }

  it("hides a closed dialog after the app's display, which stays off the hidden element", () => {
    Scene.scene(
      { update, view },
      Scene.given(closed),
      ...hasStyles(element, dialog.hidden),
      Scene.expect(element).not.toHaveClass(classOf(styles.grid)),
    );
  });

  it("keeps the app's display on a visible dialog and puts each part's styles on its element", () => {
    Scene.scene(
      { update, view },
      Scene.given(open),
      ...hasStyles(element, dialog.dialog, styles.grid),
      Scene.expect(element).not.toHaveClass(classOf(dialog.hidden)),
      ...hasStyles(backdrop, dialog.backdrop),
      ...hasStyles(panel, dialog.panel, styles.panel),
      ...hasStyles(Scene.selector("#confirm-dialog-title"), styles.title),
      ...hasStyles(Scene.selector("#confirm-dialog-description"), styles.description),
      ...hasStyles(Scene.selector("#cancel"), styles.closeButton),
      acquired,
    );
  });

  it("lets the app's color and panel position replace the defaults", () => {
    Scene.scene(
      {
        update,
        view: viewWith(
          DialogStyle.view(Dialog.view, { dialog: styles.ink, panel: styles.absolute }),
        ),
      },
      Scene.given(open),
      ...hasStyles(element, styles.ink),
      Scene.expect(element).not.toHaveClass(classOf(dialog.dialog)),
      ...hasStyles(panel, styles.absolute),
      Scene.expect(panel).not.toHaveClass(classOf(dialog.panel)),
      acquired,
    );
  });

  it("still closes from a click on the styled close button", () => {
    Scene.scene(
      { update, view },
      Scene.given(open),
      acquired,
      Scene.click(Scene.selector("#cancel")),
      Scene.expect(element).not.toHaveAttr("data-open"),
      ...hasStyles(element, dialog.hidden),
      Scene.Mount.expectEnded(Dialog.AcquireResources),
    );
  });
});

describe("@foldkit/ui defects DialogStyle works around", () => {
  // A hidden attribute alone would not do: an app's display beats the user agent's [hidden] rule.
  it("F6: a closed dialog has no inline display", () => {
    Scene.scene(
      { update, view },
      Scene.given(closed),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, "#confirm"),
          "@foldkit/ui now hides a closed Dialog inline (F6). Drop dialog.hidden from functional-styles.ts and its after-rule from dialog-style.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("display");
      }),
    );
  });
});
