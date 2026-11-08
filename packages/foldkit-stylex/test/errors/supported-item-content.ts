// expect: "This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Listbox changed ItemConfig.accepts. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."
import type { Has } from "../../src/internal/items.ts";
import type { Reads } from "../../src/internal/listbox.ts";
import type { Supported } from "../../src/internal/supported.ts";
import type { Html } from "foldkit/html";

// An installed @foldkit/ui whose Listbox item config renamed content, against Listbox's reads.
import { Listbox } from "@foldkit/ui";

type Inputs = Listbox.ViewInputs<"pl">;

type Renamed = Omit<Inputs, "itemToConfig"> &
  Readonly<{
    itemToConfig: (
      item: "pl",
      context: Parameters<Inputs["itemToConfig"]>[1],
    ) => Readonly<{ children: Html; className?: string }>;
  }>;

const Languages = Listbox.create<"pl">();

export const x: Supported<
  "Listbox",
  Has<Listbox.Model, Renamed>,
  Reads,
  typeof Languages.view
> = Languages.view;
