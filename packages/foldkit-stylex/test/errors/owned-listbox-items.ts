// expect: "@foldkit/ui sets maxHeight inline on this part. Floating UI positions the panel and caps its height; size and scroll an element inside it."
import { Listbox } from "@foldkit/ui";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

const Languages = Listbox.create<"pl" | "en">();

export const x = ListboxStyle.view(Languages.view, { items: s.tall });
