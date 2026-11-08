// The gallery's core-only Popover demo, linked into src/demos/, as a whole app.
import type { Document, HtmlBuilder } from "foldkit/html";

import { view as popover, type Message, type Model } from "./demos/popover.ts";

export { Model, init, update } from "./demos/popover.ts";

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "Core",
  body: h.main([], [popover(model, h)]),
});
