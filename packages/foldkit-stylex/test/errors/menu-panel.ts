// expect: "Menu calls its panel items: put these styles under items."
import { Menu } from "@foldkit/ui";
import { MenuStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const Actions = Menu.create<"copy" | "paste">();

export const x = MenuStyle.view(Actions.view, { panel: s.base });
