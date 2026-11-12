import type { Subscription, Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

/** One way to customise a demo's component, shown on a canvas of its own below the demo. */
export type Example<Model, Message> = Readonly<{
  heading: string;
  /** What the example changes, and how. */
  caption: string;
  /** The call that builds the example's view, such as `Button.restyle(Button.primary)`. */
  code: string;
  view: (model: Model, h: HtmlBuilder<Message>) => Html;
}>;

/**
 * What every module in `src/demos/` exports: a Foldkit program that shows one component, styled by
 * the theme, on its page. Adding a page takes that file and its place in a group of src/pages.ts.
 *
 * - The file name names the page: `radio-group.ts` renders at `/radio-group` under `RadioGroup`.
 * - `view` shows the component as the theme draws it. Each of `examples` customises it, sharing
 *   the demo's model, so it gives its own components ids that `view` does not use.
 * - `init` runs on the server and again in the browser to hydrate, so it must return the same
 *   model in both: no clock, randomness or browser state.
 * - `subscriptions` is for components that listen outside their elements, such as Slider's drag.
 */
export type Demo<Model, Message> = Readonly<{
  /** One sentence under the page's heading: what the component is for. */
  summary: string;
  init: () => Update.Return<Model, Message>;
  update: (model: Model, message: Message) => Update.Return<Model, Message>;
  view: (model: Model, h: HtmlBuilder<Message>) => Html;
  examples?: ReadonlyArray<Example<Model, Message>>;
  subscriptions?: Subscription.Subscriptions<Model, Message>;
}>;
