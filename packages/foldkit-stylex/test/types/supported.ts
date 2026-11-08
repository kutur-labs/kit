// Changes to @foldkit/ui that this release still works with: each line compiles only while
// `Supported` in src/internal/supported.ts accepts them.
import type * as CalendarParts from "../../src/internal/calendar.ts";
import type { Has } from "../../src/internal/items.ts";
import type { Reads } from "../../src/internal/listbox.ts";
import type { Supported } from "../../src/internal/supported.ts";
import type { Html } from "foldkit/html";

import { Calendar, Listbox } from "@foldkit/ui";

type Inputs = Listbox.ViewInputs<"pl">;

type WidenedContent = Omit<Inputs, "itemToConfig"> &
  Readonly<{
    itemToConfig: (
      item: "pl",
      context: Parameters<Inputs["itemToConfig"]>[1],
    ) => Readonly<{ content: Html | string; className?: string }>;
  }>;

const Languages = Listbox.create<"pl">();

// An item config whose content also takes a string still takes the config this package returns.
export const widenedContent: Supported<
  "Listbox",
  Has<Listbox.Model, WidenedContent>,
  Reads,
  typeof Languages.view
> = Languages.view;

type WidenedToView = Omit<Calendar.ViewInputs, "toView"> &
  Readonly<{
    toView: (attributes: Parameters<Calendar.ViewInputs["toView"]>[0]) => Html | string;
  }>;

// This package hands what the app's toView returns to @foldkit/ui unread, so any return type works.
export const widenedToView: Supported<
  "Calendar",
  CalendarParts.Has<WidenedToView>,
  CalendarParts.Reads<"toView">,
  typeof Calendar.view
> = Calendar.view;
