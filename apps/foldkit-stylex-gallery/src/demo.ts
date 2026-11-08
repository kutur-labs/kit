import type { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

/**
 * What every module in `src/demos/` (core only) and `src/themed/` (with the theme's looks) exports:
 * a Foldkit program that the gallery embeds in its component's page. Adding a component's page
 * takes one file in each directory, nothing else.
 *
 * - The file name names the page: `radio-group.ts` renders at `/radio-group` under `RadioGroup`.
 * - `src/themed/x.ts` needs `src/demos/x.ts`; a component may have a core demo alone.
 * - Both demos share a page, so prefix every id a themed demo gives @foldkit/ui with `themed-`.
 * - `init` runs on the server and again in the browser to hydrate, so it must return the same
 *   model in both: no clock, randomness or browser state.
 * - `subscriptions` is for components that listen outside their elements, such as Slider's drag.
 */
export type Demo<Model, Message> = Readonly<{
  init: () => Update.Return<Model, Message>;
  update: (model: Model, message: Message) => Update.Return<Model, Message>;
  view: (model: Model, h: HtmlBuilder<Message>) => Html;
  subscriptions?: Subscription.Subscriptions<Model, Message>;
}>;
