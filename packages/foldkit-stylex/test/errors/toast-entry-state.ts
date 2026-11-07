// expect: Property 'variant' does not exist on type 'Readonly<{ "@foldkit/ui gives every entry one class, so entry takes no state. Style each variant on your own element inside entryToView, from entry.variant.": never; }>'.
import { Toast as Ui } from "@foldkit/ui";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import { Schema } from "effect";

import { s } from "./_styles.ts";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

export const x = ToastStyle.view(Toast.view, {
  entry: (state) => state.variant === "Error" && s.open,
});
