// The gallery's themed Popover demo, linked into src/themed/, as a whole app.
import type { Document, HtmlBuilder } from "foldkit/html";

import { view as popover, type Message, type Model } from "./themed/popover.ts";

export { Model, init, update } from "./themed/popover.ts";

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "Themed",
  body: h.main([], [popover(model, h)]),
});
