import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Nav } from "@foldkit/ui";
import type { ChildAttribute, Html } from "foldkit/html";

import {
  appendChildClass,
  partsOf,
  type Layers,
  type PartStyle,
  type PartValue,
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
  readonly nav?: PartValue;
  /** Each item's link, which gets `href` from `toHref`, styled from its own `LinkState`. */
  readonly link?: PartStyle<LinkState>;
}

// Everything this module reads from @foldkit/ui's Nav. `Supported` checks that the installed
// @foldkit/ui still has it.
type Reads = Readonly<{
  RenderInfo: Readonly<{
    nav: ReadonlyArray<ChildAttribute>;
    items: ReadonlyArray<
      Readonly<{ link: ReadonlyArray<ChildAttribute>; isCurrent: boolean; index: number }>
    >;
  }>;
}>;

type Has = Readonly<{ RenderInfo: Nav.RenderInfo }>;

/**
 * `Nav.view` with each part's styles on the bundles `toView` gets. It takes no `h`, as `Nav.view`
 * does. Pass several styles objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    navView: Supported<"Nav", Has, Reads, typeof Nav.view>,
    ...layers: Layers<List, Own.None>
  ) =>
  <Value extends string>(inputs: Nav.ViewInputs<Value>): Html =>
    navView({
      ...inputs,
      toView: (render) =>
        inputs.toView({
          ...render,
          nav: appendChildClass(
            render.nav,
            layers.map((s) => s.nav),
          ),
          items: render.items.map((item) => ({
            ...item,
            link: appendChildClass(
              item.link,
              partsOf(layers, {
                isCurrent: item.isCurrent,
                index: item.index,
              } satisfies LinkState)((s) => s.link),
            ),
          })),
        }),
    });
