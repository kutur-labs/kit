import type { HtmlBuilder } from "foldkit/html";

import { FileDrop } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, expect, it } from "vitest";

import { FileDropStyle } from "../../src/index.ts";
import { fileDrop } from "../../src/internal/functional-styles.ts";
import { agrees, hasStyles } from "../classes.ts";

const styles = stylex.create({
  root: { padding: 16 },
  isDragOver: { borderColor: "black" },
  isDisabled: { opacity: 0.5 },
});

const fileDropView = FileDropStyle.view(FileDrop.view, {
  root: (state) => [
    styles.root,
    state.isDragOver && styles.isDragOver,
    state.isDisabled && styles.isDisabled,
  ],
});

// The optional input this test varies, left out where it checks its default, and the files the
// zone received.
type Model = Readonly<{
  fileDrop: FileDrop.Model;
  inputs: Pick<FileDrop.ViewInputs, "isDisabled">;
  received: ReadonlyArray<string>;
}>;

const view = (model: Model, h: HtmlBuilder<FileDrop.Message>) =>
  fileDropView(
    model.fileDrop,
    {
      ...model.inputs,
      toView: ({ root, input }) =>
        h.label([...root, h.Id("root")], [h.input([...input]), h.p([], [model.received.join()])]),
    },
    h,
  );

const update = (model: Model, message: FileDrop.Message) => {
  const next = FileDrop.update(model.fileDrop, message);

  return {
    model: {
      ...model,
      fileDrop: next.model,
      received:
        next.outMessage?._tag === "ReceivedFiles"
          ? next.outMessage.files.map((file) => file.name)
          : model.received,
    },
  };
};

const idle = FileDrop.init({ id: "upload" });

const root = Scene.selector("#root");

const input = Scene.selector("#upload");

describe("FileDropStyle.view", () => {
  for (const isDragOver of [false, true]) {
    it(`sets isDragOver where @foldkit/ui sets data-drag-over: ${String(isDragOver)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ fileDrop: { ...idle, isDragOver }, inputs: {}, received: [] }),
        ...agrees(root, "data-drag-over", styles.isDragOver, isDragOver),
      );
    });
  }

  for (const inputs of [{}, { isDisabled: false }, { isDisabled: true }]) {
    it(`sets isDisabled where @foldkit/ui sets data-disabled: ${JSON.stringify(inputs)}`, () => {
      Scene.scene(
        { update, view },
        Scene.given({ fileDrop: idle, inputs, received: [] }),
        ...agrees(root, "data-disabled", styles.isDisabled, inputs.isDisabled === true),
      );
    });
  }

  it("puts the root's styles on it and hides the input visually in place of sr-only", () => {
    Scene.scene(
      { update, view },
      Scene.given({ fileDrop: idle, inputs: {}, received: [] }),
      ...hasStyles(root, styles.root),
      ...hasStyles(input, fileDrop.input),
      Scene.expect(input).not.toHaveClass("sr-only"),
    );
  });

  it("still receives files chosen through the hidden input", () => {
    Scene.scene(
      { update, view },
      Scene.given({ fileDrop: idle, inputs: {}, received: [] }),
      Scene.changeFiles(input, [new File(["zine"], "zine.pdf")]),
      Scene.expect(root).toContainText("zine.pdf"),
    );
  });
});

describe("@foldkit/ui defects FileDropStyle works around", () => {
  it("F3: the input is hidden only by a class, not inline", () => {
    Scene.scene(
      {
        update: (model: FileDrop.Model) => ({ model }),
        view: (model: FileDrop.Model, h: HtmlBuilder<FileDrop.Message>) =>
          FileDrop.view(model, { toView: ({ input: bundle }) => h.input([...bundle]) }, h),
      },
      Scene.given(idle),
      Scene.tap((simulation) => {
        expect(
          Scene.find(simulation.html, "#upload"),
          "@foldkit/ui now hides FileDrop's input inline (F3). Drop fileDrop from functional-styles.ts and its use in file-drop-style.ts; update the README's What the package sets table.",
        ).not.toHaveStyle("position");
      }),
    );
  });
});
