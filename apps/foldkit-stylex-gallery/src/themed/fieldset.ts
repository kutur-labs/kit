import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Fieldset, Input, Select, Textarea } from "@foldkit/ui";
import {
  FieldsetStyle,
  InputStyle,
  SelectStyle,
  TextareaStyle,
  sx,
} from "@kutur-kit/foldkit-stylex";
import { fieldsetTheme } from "@kutur-kit/foldkit-stylex-theme/fieldset";
import { inputTheme } from "@kutur-kit/foldkit-stylex-theme/input";
import { selectChevron, selectTheme } from "@kutur-kit/foldkit-stylex-theme/select";
import { textareaTheme } from "@kutur-kit/foldkit-stylex-theme/textarea";
import { fontSize } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ name: Schema.String, note: Schema.String });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ChangedName: { value: Schema.String },
  ChangedNote: { value: Schema.String },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { name: "", note: "" } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedName: ({ value }) => ({ model: { ...model, name: value } }),
    ChangedNote: ({ value }) => ({ model: { ...model, note: value } }),
  });

const styles = stylex.create({
  form: { display: "grid", gap: 16, maxInlineSize: 420 },
  field: { display: "grid", gap: 4 },
  description: { margin: 0 },
  // Layered over the look's legend: a small uppercase heading.
  eyebrow: { fontSize: fontSize.sm, letterSpacing: "0.08em", textTransform: "uppercase" },
});

const fieldsetView = FieldsetStyle.view(Fieldset.view, fieldsetTheme, {
  legend: styles.eyebrow,
  description: styles.description,
});

const inputView = InputStyle.view(Input.view, inputTheme);

const textareaView = TextareaStyle.view(Textarea.view, textareaTheme);

const selectView = SelectStyle.view(Select.view, selectTheme);

const contact = (model: Model, h: HtmlBuilder<Message>): Html =>
  fieldsetView(
    {
      id: "themed-contact",
      hasDescription: true,
      toView: ({ fieldset, legend, description }) =>
        h.fieldset(
          [...fieldset],
          [
            h.legend([...legend], ["Contact"]),
            h.p([...description], ["How we answer your letter."]),
            inputView(
              {
                id: "themed-contact-name",
                value: model.name,
                onInput: (value) => Message.ChangedName({ value }),
                toView: ({ input, label }) =>
                  h.div([sx(styles.field)], [h.label([...label], ["Name"]), h.input([...input])]),
              },
              h,
            ),
            textareaView(
              {
                id: "themed-contact-note",
                value: model.note,
                rows: 3,
                onInput: (value) => Message.ChangedNote({ value }),
                toView: ({ textarea, label }) =>
                  h.div(
                    [sx(styles.field)],
                    [h.label([...label], ["Note"]), h.textarea([...textarea])],
                  ),
              },
              h,
            ),
          ],
        ),
    },
    h,
  );

// The fieldset disables the native controls, but not each component's flag, which the looks
// read: pass `isDisabled` to every control too.
const delivery = (h: HtmlBuilder<Message>): Html =>
  fieldsetView(
    {
      id: "themed-delivery",
      isDisabled: true,
      hasDescription: true,
      toView: ({ fieldset, legend, description }) =>
        h.fieldset(
          [...fieldset],
          [
            h.legend([...legend], ["Delivery"]),
            h.p([...description], ["Delivery opens with the spring edition."]),
            selectView(
              {
                id: "themed-delivery-country",
                isDisabled: true,
                toView: ({ select, label }) =>
                  h.div(
                    [sx(styles.field)],
                    [
                      h.label([...label], ["Country"]),
                      h.div(
                        [sx(selectChevron.field)],
                        [
                          h.select([...select], [h.option([h.Value("pl")], ["Polska"])]),
                          h.span(
                            [h.AriaHidden(true), sx(selectChevron.chevron, selectChevron.disabled)],
                            ["▾"],
                          ),
                        ],
                      ),
                    ],
                  ),
              },
              h,
            ),
            inputView(
              {
                id: "themed-delivery-postcode",
                isDisabled: true,
                toView: ({ input, label }) =>
                  h.div(
                    [sx(styles.field)],
                    [h.label([...label], ["Postcode"]), h.input([...input])],
                  ),
              },
              h,
            ),
          ],
        ),
    },
    h,
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([sx(styles.form)], [contact(model, h), delivery(h)]);
