import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isChecked: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledTerms: { isChecked: Schema.Boolean } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { isChecked: false } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledTerms: ({ isChecked }) => ({ model: { isChecked } }),
  });

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  box: {
    display: "grid",
    placeItems: "center",
    inlineSize: 24,
    blockSize: 24,
    padding: 0,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
  },
  checked: { backgroundColor: { default: "black", ":hover": "dimgray" }, color: "white" },
  disabled: { opacity: 0.5 },
  tick: { opacity: 0 },
  ticked: { opacity: 1 },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, {
  checkbox: (state) => [
    styles.box,
    state.isChecked && styles.checked,
    state.isDisabled && styles.disabled,
  ],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  checkboxView(
    {
      id: "terms",
      isChecked: model.isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button(
              [...checkbox],
              [h.span([sx(styles.tick, model.isChecked && styles.ticked)], ["✓"])],
            ),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );
