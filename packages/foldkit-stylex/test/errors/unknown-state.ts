// expect: Property 'isHighlighted' does not exist on type 'ItemState'.
import { Listbox } from "@foldkit/ui";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const Languages = Listbox.create<"pl" | "en">();

export const x = ListboxStyle.view(Languages.view, {
  item: (state) => (state.isHighlighted ? s.open : null),
});
