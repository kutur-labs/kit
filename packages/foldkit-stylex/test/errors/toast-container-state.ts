// expect: "This part has one class in every state, so pass its styles, not a function of state."
import { Toast as Ui } from "@foldkit/ui";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import { Schema } from "effect";

import { s } from "./_styles.ts";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

export const x = ToastStyle.view(Toast.view, { container: () => s.base });
