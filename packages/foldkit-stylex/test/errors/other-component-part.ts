// expect: "Listbox calls its panel items: put these styles under items."
import { Listbox } from "@foldkit/ui";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const Languages = Listbox.create<"pl" | "en">();

export const x = ListboxStyle.view(Languages.view, { panel: s.base });
