import type { HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { VirtualListStyle } from "../../src/index.ts";
import { hasStyles } from "../classes.ts";

const styles = stylex.create({
  container: { blockSize: 60, borderWidth: 1 },
  wide: { inlineSize: 320 },
});

const virtualListView = VirtualListStyle.view(
  VirtualList.view<string>(),
  { container: styles.container },
  { container: styles.wide },
);

const view = (model: VirtualList.Model, h: HtmlBuilder<VirtualList.Message>) =>
  virtualListView(
    model,
    {
      items: ["a", "b", "c", "d", "e"],
      itemToKey: (item) => item,
      itemToView: (item) => h.span([], [item]),
    },
    h,
  );

const update = (model: VirtualList.Model, message: VirtualList.Message) => {
  const next = VirtualList.update(model, message);

  return { model: next.model, commands: next.commands ?? [] };
};

const unmeasured = VirtualList.init({ id: "rows", rowHeightPx: 20 });

const container = Scene.selector("#rows");

// The container's Mount, which Scene requires resolved. @foldkit/ui's public VirtualList module
// does not export its definition, so this matches it by name.
const measured = Scene.Mount.resolve(
  { name: "ObserveVirtualList" },
  VirtualList.Message.ResizedContainer({ containerWidth: 320, containerHeight: 60 }),
);

describe("VirtualListStyle.view", () => {
  it("puts every layer's container styles on the container, next to @foldkit/ui's inline style", () => {
    Scene.scene(
      { update, view },
      Scene.given(unmeasured),
      ...hasStyles(container, styles.container, styles.wide),
      Scene.expect(container).toHaveStyle("overflow", "auto"),
      measured,
    );
  });

  it("still renders rows once the styled container is measured", () => {
    Scene.scene(
      { update, view },
      Scene.given(unmeasured),
      measured,
      Scene.expect(Scene.selector('[data-virtual-list-item-key="a"]')).toExist(),
      ...hasStyles(container, styles.container, styles.wide),
    );
  });
});
