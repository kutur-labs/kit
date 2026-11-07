import type { Document, HtmlBuilder } from "foldkit/html";

import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { terms } from "./demos/checkbox.ts";

export const Model = Schema.Struct({ isChecked: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledTerms: { isChecked: Schema.Boolean } });

export type Message = typeof Message.Type;

export const init = () => ({ model: { isChecked: false } });

export const update = (_model: Model, message: Message) =>
  Message.match(message, { ToggledTerms: ({ isChecked }) => ({ model: { isChecked } }) });

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "@kutur-kit/foldkit-stylex gallery",
  body: h.main([], [terms(model.isChecked, (isChecked) => Message.ToggledTerms({ isChecked }), h)]),
});
