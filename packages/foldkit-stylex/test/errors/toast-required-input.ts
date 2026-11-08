// expect: Property 'motion' is missing in type
// A Toast.make view that gained a required input: the kit's mirror of its inputs rejects it,
// because view parameters are contravariant.
import type { Html, HtmlBuilder } from "foldkit/html";

import { Toast as Ui } from "@foldkit/ui";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import { Schema } from "effect";
import { defineView } from "foldkit/submodel";

const Toast = Ui.make(Schema.Struct({ text: Schema.String }));

type Entry = Parameters<Parameters<typeof Toast.view>[1]["entryToView"]>[0];

type NewerInputs = Parameters<typeof Toast.view>[1] & Readonly<{ motion: "Slide" | "Fade" }>;

const newerView = defineView<typeof Toast.Model.Type, typeof Toast.Message.Type, NewerInputs>(
  (model, inputs, h: HtmlBuilder<typeof Toast.Message.Type>): Html => Toast.view(model, inputs, h),
);

export const x = ToastStyle.view<typeof Toast.Model.Type, typeof Toast.Message.Type, Entry, []>(
  newerView,
);
