import { Toast as Ui } from "@foldkit/ui";
import { Schema } from "effect";

/** The app's toast stack, with a text payload. */
export const Toast = Ui.make(Schema.Struct({ text: Schema.String }));
