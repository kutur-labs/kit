import type { Supported } from "./internal/supported.ts";
import type { Tabs } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { tabs } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type CheckedLayers, type PartStyle } from "./internal/part.ts";

/** The tab list's state, from its view inputs. */
export interface State {
  /** The `orientation` input, `"Horizontal"` unless set; @foldkit/ui sets `aria-orientation`. */
  readonly orientation: Tabs.Orientation;
}

/** A tab's or panel's state. Style focus with `':focus-visible'`. */
export interface TabState extends State {
  /** The selected tab and its panel, where @foldkit/ui sets `data-selected`. */
  readonly isActive: boolean;
  /** From `isTabDisabled`; @foldkit/ui sets `disabled` and `data-disabled` on the tab. */
  readonly isDisabled: boolean;
  /** The tab's position in `tabs`, from 0. */
  readonly index: number;
}

/** Styles for each part of Tabs. */
export interface Styles {
  /** The element around the tabs, with `role="tablist"`. */
  readonly tablist?: PartStyle<State>;
  /** Each tab button. */
  readonly tab?: PartStyle<TabState>;
  /** With `panelMount: "All"`, this package hides each inactive panel after these styles. */
  readonly panel?: PartStyle<TabState>;
}

// Everything this module reads from @foldkit/ui's Tabs. `stateOf`, `styledTab` and `view` read
// only through these types, and `Supported` checks that the installed @foldkit/ui still has them.
// Orientations are spelled out, so a renamed one fails `Supported` too.
type Reads = Readonly<{
  RenderInfo: Readonly<{
    tablist: ReadonlyArray<ChildAttribute>;
    tabs: ReadonlyArray<
      Readonly<{
        tab: ReadonlyArray<ChildAttribute>;
        panel: ReadonlyArray<ChildAttribute>;
        isActive: boolean;
        isDisabled: boolean;
        index: number;
      }>
    >;
  }>;
  ViewInputs: Readonly<{
    orientation?: "Horizontal" | "Vertical";
    toView: (render: never) => void;
  }>;
}>;

type Has = Readonly<{ RenderInfo: Tabs.RenderInfo; ViewInputs: Tabs.ViewInputs }>;

const stateOf = (inputs: Reads["ViewInputs"]): State => ({
  orientation: inputs.orientation ?? "Horizontal",
});

// A tab's and its panel's bundles, with their styles.
const styledTab = (
  layers: ReadonlyArray<Styles>,
  state: State,
  reads: Reads["RenderInfo"]["tabs"][number],
) => {
  const part = partsOf(layers, {
    ...state,
    isActive: reads.isActive,
    isDisabled: reads.isDisabled,
    index: reads.index,
  } satisfies TabState);

  return {
    tab: appendChildClass(
      reads.tab,
      part((s) => s.tab),
    ),
    // After the app's styles: with panelMount "All", @foldkit/ui hides no panel.
    panel: appendChildClass(
      reads.panel,
      part((s) => s.panel),
      !reads.isActive && tabs.hidden,
    ),
  };
};

/**
 * Styles objects applied in order after the ones in `Before`, each checked against `Styles`, the
 * properties its parts cannot set and every styles object before it.
 */
export type Layers<
  List extends ReadonlyArray<Styles>,
  Before extends ReadonlyArray<Styles> = [],
> = CheckedLayers<List, Styles, "Tabs", Before>;

/** A `Tabs.create` view with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <Value extends string, const List extends ReadonlyArray<Styles>>(
  tabsView: Supported<"Tabs", Has, Reads, View<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>>>,
  ...layers: Layers<List>
): View<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>> =>
  defineView<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>>((model, inputs, h) =>
    tabsView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const reads: Reads["RenderInfo"] = render;
          const state = stateOf(inputs);

          return inputs.toView({
            ...render,
            tablist: appendChildClass(
              reads.tablist,
              partsOf(layers, state)((s) => s.tablist),
            ),
            tabs: render.tabs.map((info) => ({ ...info, ...styledTab(layers, state, info) })),
          });
        },
      },
      h,
    ),
  );
