import type { Html, HtmlBuilder } from "foldkit/html";

import { Nav } from "@foldkit/ui";
import { NavStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

type Section = "poems" | "notes";

// Indexing by `item.value` compiles only while the styled view infers Value as Section, not string.
const labels: Readonly<Record<Section, string>> = { poems: "Wiersze", notes: "Notatki" };

// Takes no `h`, as Nav.view does.
export const sections = <Message>(current: Section, h: HtmlBuilder<Message>): Html =>
  navView({
    items: ["poems", "notes"],
    ariaLabel: "Działy",
    toHref: (section) => `/${section}`,
    isItemCurrent: (section) => section === current,
    toView: ({ nav, items }) =>
      h.nav(
        [...nav],
        items.map((item) => h.a([...item.link], [labels[item.value]])),
      ),
  });

const styles = stylex.create({
  nav: { display: "flex", gap: 16 },
  link: { minBlockSize: 44, textDecorationLine: "none" },
  current: { textDecorationLine: "underline" },
});

const navView = NavStyle.view(Nav.view, {
  nav: styles.nav,
  link: (state) => [styles.link, state.isCurrent && styles.current],
});
