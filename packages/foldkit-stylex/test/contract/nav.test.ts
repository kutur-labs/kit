import type { HtmlBuilder } from "foldkit/html";

import { Nav } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import * as Scene from "foldkit/scene";
import { describe, it } from "vitest";

import { NavStyle } from "../../src/index.ts";
import { agrees, classOf, hasStyles } from "../classes.ts";

const styles = stylex.create({
  nav: { display: "flex" },
  isCurrent: { fontWeight: 700 },
  first: { paddingInlineStart: 0 },
});

const navView = NavStyle.view(Nav.view, {
  nav: styles.nav,
  link: (state) => [state.isCurrent && styles.isCurrent, state.index === 0 && styles.first],
});

type Section = "poems" | "notes" | "drafts";

const sections: ReadonlyArray<Section> = ["poems", "notes", "drafts"];

// The model is the section the URL shows; Nav sends no Message.
const view = (current: Section, h: HtmlBuilder<never>) =>
  navView({
    items: sections,
    ariaLabel: "Sections",
    toHref: (section) => `/${section}`,
    isItemCurrent: (section) => section === current,
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        items.map((item) => h.a([...item.link, h.Id(item.value)], [item.value])),
      ),
  });

const update = (current: Section) => ({ model: current });

describe("NavStyle.view", () => {
  for (const current of sections) {
    it(`sets isCurrent on each link where @foldkit/ui sets data-current: ${current}`, () => {
      Scene.scene(
        { update, view },
        Scene.given(current),
        ...sections.flatMap((section) =>
          agrees(
            Scene.selector(`#${section}`),
            "data-current",
            styles.isCurrent,
            section === current,
          ),
        ),
      );
    });
  }

  it("gives each link its position in items, and the nav its styles", () => {
    Scene.scene(
      { update, view },
      Scene.given<Section>("notes"),
      ...hasStyles(Scene.role("navigation"), styles.nav),
      ...hasStyles(Scene.selector("#poems"), styles.first),
      Scene.expect(Scene.selector("#notes")).not.toHaveClass(classOf(styles.first)),
    );
  });

  it("keeps each link's href and the current link's aria-current", () => {
    Scene.scene(
      { update, view },
      Scene.given<Section>("notes"),
      Scene.expect(Scene.selector("#drafts")).toHaveAttr("href", "/drafts"),
      Scene.expect(Scene.selector("#notes")).toHaveAttr("aria-current", "page"),
      Scene.expect(Scene.role("navigation")).toHaveAttr("aria-label", "Sections"),
    );
  });
});
