import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Disclosure } from "@kutur-kit/foldkit-stylex-theme/disclosure";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Shows and hides a section under its button.";

const Topic = Schema.Literals(["shipping", "returns"]);

type Topic = typeof Topic.Type;

export const Model = Schema.Struct({ shipping: Schema.Boolean, returns: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledTopic: { topic: Topic, isOpen: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { shipping: false, returns: false },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledTopic: ({ topic, isOpen }) => ({ model: { ...model, [topic]: isOpen } }),
  });

const styles = stylex.create({
  list: { inlineSize: "100%", maxInlineSize: "28rem" },
  // Hairlines between the topics, as a list of questions draws them.
  topic: {
    paddingBlock: space.xs,
    borderBlockEndWidth: { default: 1, ":last-child": 0 },
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
});

const topics = {
  shipping: {
    title: "When will my order ship?",
    text: "Orders leave the shop within two working days, with tracking by email.",
  },
  returns: {
    title: "Can I return a book?",
    text: "Send anything back within 30 days for a full refund.",
  },
} satisfies Record<Topic, Readonly<{ title: string; text: string }>>;

const topic = (name: Topic, model: Model, h: HtmlBuilder<Message>): Html =>
  Disclosure.view(
    {
      id: name,
      isOpen: model[name],
      onToggle: (isOpen) => Message.ToggledTopic({ topic: name, isOpen }),
      // The panel appears at once rather than through `animatePanel`. Its wrappers take no class,
      // so no StyleX style reaches their inline height transition to drop it under
      // prefers-reduced-motion (WCAG 2.3.3); only a global `!important` rule on their markup could.
      toView: ({ button, panel }) =>
        h.div(
          [sx(styles.topic)],
          [
            h.button(
              [...button],
              [Disclosure.buttonContent(topics[name].title, { isOpen: model[name] })],
            ),
            ...(model[name] ? [h.div([...panel], [topics[name].text])] : []),
          ],
        ),
    },
    h,
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.list)],
    Topic.literals.map((name) => topic(name, model, h)),
  );
