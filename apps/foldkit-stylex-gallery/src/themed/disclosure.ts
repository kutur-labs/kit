import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import { DisclosureStyle, sx } from "@kutur-kit/foldkit-stylex";
import { disclosureChevron, disclosureTheme } from "@kutur-kit/foldkit-stylex-theme/disclosure";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

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
  list: { display: "grid", gap: space.sm, maxInlineSize: "28rem" },
  // The app's own question and answer, layered over the look: an underline instead of a box.
  question: {
    borderWidth: 0,
    borderBlockEndWidth: 1,
    borderRadius: 0,
    fontWeight: 600,
  },
  answer: { color: color.muted },
});

const disclosureView = DisclosureStyle.view(Disclosure.view, disclosureTheme);

const questionView = DisclosureStyle.view(Disclosure.view, disclosureTheme, {
  button: styles.question,
  panel: styles.answer,
});

const topics = {
  shipping: { title: "Shipping", text: "Orders leave the shop within two working days." },
  returns: { title: "Returns", text: "Send anything back within 30 days for a full refund." },
} satisfies Record<Topic, Readonly<{ title: string; text: string }>>;

const topic = (name: Topic, model: Model, h: HtmlBuilder<Message>): Html =>
  (name === "returns" ? questionView : disclosureView)(
    {
      id: `themed-${name}`,
      isOpen: model[name],
      onToggle: (isOpen) => Message.ToggledTopic({ topic: name, isOpen }),
      toView: ({ button, panel, animatePanel }) =>
        h.div(
          [],
          [
            h.button(
              [...button],
              [
                topics[name].title,
                h.span(
                  [
                    h.AriaHidden(true),
                    sx(disclosureChevron.chevron, model[name] && disclosureChevron.open),
                  ],
                  ["▾"],
                ),
              ],
            ),
            animatePanel(h.div([...panel], [topics[name].text])),
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
