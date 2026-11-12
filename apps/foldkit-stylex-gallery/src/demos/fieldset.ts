import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Fieldset } from "@kutur-kit/foldkit-stylex-theme/fieldset";
import { Input } from "@kutur-kit/foldkit-stylex-theme/input";
import { Select } from "@kutur-kit/foldkit-stylex-theme/select";
import { Textarea } from "@kutur-kit/foldkit-stylex-theme/textarea";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Groups related fields under a legend, and can disable them together.";

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
  form: { display: "grid", gap: space.xl, inlineSize: "100%", maxInlineSize: "24rem" },
  field: { display: "grid", gap: space.sm },
});

const contact = (model: Model, h: HtmlBuilder<Message>): Html =>
  Fieldset.view(
    {
      id: "contact",
      hasDescription: true,
      toView: ({ fieldset, legend, description }) =>
        h.fieldset(
          [...fieldset],
          [
            h.legend([...legend], ["Contact"]),
            h.p([...description], ["How we answer your letter."]),
            Input.view(
              {
                id: "contact-name",
                value: model.name,
                onInput: (value) => Message.ChangedName({ value }),
                toView: ({ input, label }) =>
                  h.div([sx(styles.field)], [h.label([...label], ["Name"]), h.input([...input])]),
              },
              h,
            ),
            Textarea.view(
              {
                id: "contact-note",
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
  Fieldset.view(
    {
      id: "delivery",
      isDisabled: true,
      hasDescription: true,
      toView: ({ fieldset, legend, description }) =>
        h.fieldset(
          [...fieldset],
          [
            h.legend([...legend], ["Delivery"]),
            h.p([...description], ["Delivery opens with the spring edition."]),
            Select.view(
              {
                id: "delivery-country",
                isDisabled: true,
                toView: ({ select, label }) =>
                  h.div(
                    [sx(styles.field)],
                    [
                      h.label([...label], ["Country"]),
                      Select.field(h.select([...select], [h.option([h.Value("pl")], ["Polska"])]), {
                        isDisabled: true,
                      }),
                    ],
                  ),
              },
              h,
            ),
            Input.view(
              {
                id: "delivery-postcode",
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
