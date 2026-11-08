import type { Supported } from "./internal/supported.ts";
import type { Nav } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import {
  appendChildClass,
  partsOf,
  staticPartsOf,
  type Layers,
  type PartStyle,
  type StatelessPart,
} from "./internal/part.ts";

/** A link's state, from the item @foldkit/ui renders it for. */
export interface LinkState {
  /** Where @foldkit/ui sets `data-current` and `aria-current="page"`, from `isItemCurrent`. */
  readonly isCurrent: boolean;
  /** The item's position in `items`. */
  readonly index: number;
}

/** Styles for each part of a Nav. */
export interface Styles {
  /** The navigation landmark; its state does not change, so it takes styles without state. */
  readonly nav?: StatelessPart;
  /** Each item's link, which gets `href` from `toHref`, styled from its own `LinkState`. */
  readonly link?: PartStyle<LinkState>;
}

// Everything this module reads from @foldkit/ui's Nav. `styledLink` and `view` read only through
// these types, and `Supported` checks that the installed @foldkit/ui still has them.
type Reads = Readonly<{
  RenderInfo: Readonly<{
    nav: ReadonlyArray<ChildAttribute>;
    items: ReadonlyArray<
      Readonly<{ link: ReadonlyArray<ChildAttribute>; isCurrent: boolean; index: number }>
    >;
  }>;
  ViewInputs: Readonly<{ toView: (render: never) => void }>;
}>;

type Has = Readonly<{ RenderInfo: Nav.RenderInfo; ViewInputs: Nav.ViewInputs }>;

// An item's link bundle, with its styles.
const styledLink = (
  layers: ReadonlyArray<Styles>,
  reads: Reads["RenderInfo"]["items"][number],
) => ({
  link: appendChildClass(
    reads.link,
    partsOf(layers, { isCurrent: reads.isCurrent, index: reads.index } satisfies LinkState)(
      (s) => s.link,
    ),
  ),
});

/**
 * `Nav.view` with each part's styles on the bundles `toView` gets. It takes no `h`, as `Nav.view`
 * does. Pass several styles objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    navView: Supported<"Nav", Has, Reads, typeof Nav.view>,
    ...layers: Layers<List, Styles, "Nav">
  ) =>
  <Value extends string>(inputs: Nav.ViewInputs<Value>): Html =>
    navView({
      ...inputs,
      toView: (render) => {
        const reads: Reads["RenderInfo"] = render;

        return inputs.toView({
          ...render,
          nav: appendChildClass(
            reads.nav,
            staticPartsOf(layers)((s) => s.nav),
          ),
          items: render.items.map((item) => ({ ...item, ...styledLink(layers, item) })),
        });
      },
    });
