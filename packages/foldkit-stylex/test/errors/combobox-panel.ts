// expect: "Combobox calls its panel items: put these styles under items."
import { Combobox } from "@foldkit/ui";
import { ComboboxStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const Cities = Combobox.create<"waw" | "krk">();

export const x = ComboboxStyle.view(Cities.view, { panel: s.base });
