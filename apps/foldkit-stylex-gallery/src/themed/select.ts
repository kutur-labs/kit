import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import { SelectStyle, sx } from "@kutur-kit/foldkit-stylex";
import { selectChevron, selectTheme } from "@kutur-kit/foldkit-stylex-theme/select";
import { fontSize, size } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

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
  form: { display: "grid", gap: 16, maxInlineSize: 360 },
  field: { display: "grid", gap: 4 },
  description: { margin: 0 },
  // Tokens set on a part resize it alone: a taller target and larger type for this select.
  large: { [size.target]: "3.5rem", [fontSize.md]: fontSize.lg },
});

const languageView = SelectStyle.view(Select.view, selectTheme, {
  description: styles.description,
});

const editionView = SelectStyle.view(Select.view, selectTheme, { select: styles.large });

const options = (choices: ReadonlyArray<Choice>, selected: string, h: HtmlBuilder<Message>) =>
  choices.map(({ value, name }) =>
    h.option([h.Value(value), h.Selected(value === selected)], [name]),
  );

// The look hides the browser's arrow; the app draws its own beside the select.
const withChevron = (select: Html, h: HtmlBuilder<Message>) =>
  h.div(
    [sx(selectChevron.field)],
    [select, h.span([h.AriaHidden(true), sx(selectChevron.chevron)], ["▾"])],
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isInvalid = model.language === "tlh";

  return h.div(
    [sx(styles.form)],
    [
      languageView(
        {
          id: "themed-language",
          value: model.language,
          isInvalid,
          hasDescription: true,
          onChange: (value) => Message.ChangedLanguage({ value }),
          toView: ({ select, label, description }) =>
            h.div(
              [sx(styles.field)],
              [
                h.label([...label], ["Language"]),
                withChevron(h.select([...select], options(languages, model.language, h)), h),
                h.p(
                  [...description],
                  [isInvalid ? "We have no Klingon menus yet." : "For the menus and the dates."],
                ),
              ],
            ),
        },
        h,
      ),
      editionView(
        {
          id: "themed-edition",
          value: model.edition,
          onChange: (value) => Message.ChangedEdition({ value }),
          toView: ({ select, label }) =>
            h.div(
              [sx(styles.field)],
              [
                h.label([...label], ["Edition"]),
                withChevron(h.select([...select], options(editions, model.edition, h)), h),
              ],
            ),
        },
        h,
      ),
    ],
  );
};
