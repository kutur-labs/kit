import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Fieldset, Input } from "@foldkit/ui";
import { FieldsetStyle, InputStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isLocked: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedLock: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { isLocked: false } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedLock: () => ({ model: { isLocked: !model.isLocked } }),
  });

const styles = stylex.create({
  form: { display: "grid", justifyItems: "start", gap: 12, maxInlineSize: 360 },
  fieldset: {
    display: "grid",
    gap: 8,
    margin: 0,
    padding: 12,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
  },
  legend: { fontWeight: 700 },
  description: { margin: 0, fontSize: 14 },
  disabled: { opacity: 0.5 },
  input: {
    padding: 8,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
  },
});

const fieldsetView = FieldsetStyle.view(Fieldset.view, {
  fieldset: (state) => [styles.fieldset, state.isDisabled && styles.disabled],
  legend: styles.legend,
  description: styles.description,
});

const inputView = InputStyle.view(Input.view, { input: styles.input });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.form)],
    [
      fieldsetView(
        {
          id: "delivery",
          isDisabled: model.isLocked,
          hasDescription: true,
          toView: ({ fieldset, legend, description }) =>
            h.fieldset(
              [...fieldset],
              [
                h.legend([...legend], ["Delivery"]),
                h.p([...description], ["Where we post the zine."]),
                // The fieldset disables the native input, but not Input's flag: pass it too.
                inputView(
                  {
                    id: "street",
                    isDisabled: model.isLocked,
                    toView: ({ input, label }) =>
                      h.div([], [h.label([...label], ["Street"]), h.input([...input])]),
                  },
                  h,
                ),
              ],
            ),
        },
        h,
      ),
      h.button(
        [h.Type("button"), h.OnClick(Message.ClickedLock())],
        [model.isLocked ? "Unlock" : "Lock"],
      ),
    ],
  );
