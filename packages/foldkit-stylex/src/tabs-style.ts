import type * as Own from "./internal/owned.ts";
import type { Supported } from "./internal/supported.ts";
import type { Tabs } from "@foldkit/ui";
import type { ChildAttribute } from "foldkit/html";

import { defineView, type View } from "foldkit/submodel";

import { tabs } from "./internal/functional-styles.ts";
import { appendChildClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/** The tab list's state, from its view inputs. */
export interface State {
  readonly orientation: Tabs.Orientation;
}

/** A tab's or panel's state. Style focus with `':focus-visible'`. */
export interface TabState extends State {
  readonly isActive: boolean;
  readonly isDisabled: boolean;
  readonly index: number;
}

/** Styles for each part of Tabs. */
export interface Styles {
  readonly tablist?: PartStyle<State>;
  readonly tab?: PartStyle<TabState>;
  /** With `panelMount: "All"`, this package hides each inactive panel after these styles. */
  readonly panel?: PartStyle<TabState>;
}

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
  ViewInputs: Readonly<{ orientation?: Tabs.Orientation }>;
}>;

type Has = Readonly<{ RenderInfo: Tabs.RenderInfo; ViewInputs: Tabs.ViewInputs }>;

/** A `Tabs.create` view with each part's styles; pass it to `h.submodel` as `view`. */
export const view = <Value extends string, const List extends ReadonlyArray<Styles>>(
  tabsView: Supported<"Tabs", Has, Reads, View<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>>>,
  ...layers: Layers<List, Own.None>
): View<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>> =>
  defineView<Tabs.Model, Tabs.Message, Tabs.ViewInputs<Value>>((model, inputs, h) =>
    tabsView(
      model,
      {
        ...inputs,
        toView: (render) => {
          const state: State = { orientation: inputs.orientation ?? "Horizontal" };

          return inputs.toView({
            ...render,
            tablist: appendChildClass(
              render.tablist,
              partsOf(layers, state)((s) => s.tablist),
            ),
            tabs: render.tabs.map((info) => {
              const part = partsOf(layers, {
                ...state,
                isActive: info.isActive,
                isDisabled: info.isDisabled,
                index: info.index,
              } satisfies TabState);

              return {
                ...info,
                tab: appendChildClass(
                  info.tab,
                  part((s) => s.tab),
                ),
                // After the app's styles: with panelMount "All", @foldkit/ui hides no panel.
                panel: appendChildClass(
                  info.panel,
                  part((s) => s.panel),
                  !info.isActive && tabs.hidden,
                ),
              };
            }),
          });
        },
      },
      h,
    ),
  );
