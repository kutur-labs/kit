import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Select } from "@foldkit/ui";
import { SelectStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

const languages = [
  { value: "pl", name: "Polski" },
  { value: "en", name: "English" },
  { value: "de", name: "Deutsch" },
];

export const Model = Schema.Struct({ language: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ChangedLanguage: { value: Schema.String } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { language: "pl" } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedLanguage: ({ value }) => ({ model: { language: value } }),
  });

const styles = stylex.create({
  field: { display: "grid", gap: 4, maxInlineSize: 320 },
  select: {
    padding: 8,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
  },
  description: { margin: 0, fontSize: 14 },
});

const selectView = SelectStyle.view(Select.view, {
  select: styles.select,
  description: styles.description,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  selectView(
    {
      id: "language",
      value: model.language,
      hasDescription: true,
      onChange: (value) => Message.ChangedLanguage({ value }),
      toView: ({ select, label, description }) =>
        h.div(
          [sx(styles.field)],
          [
            h.label([...label], ["Language"]),
            h.select(
              [...select],
              languages.map(({ value, name }) =>
                h.option([h.Value(value), h.Selected(value === model.language)], [name]),
              ),
            ),
            h.p([...description], ["For the menus and the dates."]),
          ],
        ),
    },
    h,
  );
