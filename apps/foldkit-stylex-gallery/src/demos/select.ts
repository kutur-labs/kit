import type { Example } from "../demo.ts";
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Select } from "@kutur-kit/foldkit-stylex-theme/select";
import { fontSize, size, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "The browser's native select, drawn to match the other fields.";

type Choice = Readonly<{ value: string; name: string }>;

const languages: ReadonlyArray<Choice> = [
  { value: "pl", name: "Polski" },
  { value: "en", name: "English" },
  { value: "tlh", name: "Klingon" },
];

const editions: ReadonlyArray<Choice> = [
  { value: "spring", name: "Spring" },
  { value: "summer", name: "Summer" },
  { value: "autumn", name: "Autumn" },
];

export const Model = Schema.Struct({ language: Schema.String, edition: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ChangedLanguage: { value: Schema.String },
  ChangedEdition: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { language: "pl", edition: "spring" },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedLanguage: ({ value }) => ({ model: { ...model, language: value } }),
    ChangedEdition: ({ value }) => ({ model: { ...model, edition: value } }),
  });

const styles = stylex.create({
  field: { display: "grid", gap: space.sm, inlineSize: "100%", maxInlineSize: "20rem" },
  // Tokens set on a part resize it alone: a taller control and larger type for this select. A
  // value set on a part replaces both of size.control's pointer branches, so it gives the coarse
  // pointer's 44px a branch of its own.
  large: {
    [size.control]: { default: "2.5rem", "@media (pointer: coarse)": "2.75rem" },
    [fontSize.md]: fontSize.lg,
  },
});

const largeView = Select.restyle({ select: styles.large }).view;

const options = (choices: ReadonlyArray<Choice>, selected: string, h: HtmlBuilder<Message>) =>
  choices.map(({ value, name }) =>
    h.option([h.Value(value), h.Selected(value === selected)], [name]),
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isInvalid = model.language === "tlh";

  return Select.view(
    {
      id: "language",
      value: model.language,
      isInvalid,
      hasDescription: true,
      onChange: (value) => Message.ChangedLanguage({ value }),
      toView: ({ select, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Language"]),
            Select.field(h.select([...select], options(languages, model.language, h))),
            h.p(
              [...description],
              [isInvalid ? "We have no Klingon menus yet." : "For the menus and the dates."],
            ),
          ],
        ),
    },
    h,
  );
};

export const examples: ReadonlyArray<Example<Model, Message>> = [
  {
    heading: "Size",
    code: "Select.restyle({ select: styles.large })",
    caption: "Tokens set on one select's part resize that select alone.",
    view: (model, h) =>
      largeView(
        {
          id: "edition",
          value: model.edition,
          onChange: (value) => Message.ChangedEdition({ value }),
          toView: ({ select, label }) =>
            h.div(
              [sx(styles.field)],
              [
                h.label([...label], ["Edition"]),
                Select.field(h.select([...select], options(editions, model.edition, h))),
              ],
            ),
        },
        h,
      ),
  },
];
