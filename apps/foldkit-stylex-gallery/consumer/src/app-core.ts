// The core README's Checkbox example, linked into src/core/, as a whole app with no theme.
import type { Document, HtmlBuilder } from "foldkit/html";

import { view as checkbox, type Message, type Model } from "./core/checkbox.ts";

export { Model, init, update } from "./core/checkbox.ts";

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "Core",
  body: h.main([], [checkbox(model, h)]),
});
