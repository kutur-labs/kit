import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Checkbox } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Turns one option on or off.";

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
  // The box centres itself on the label's first line, so the row aligns to the start.
  row: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignItems: "start",
    columnGap: space.sm,
  },
  text: { display: "grid", gap: "0.125rem" },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Checkbox.view(
    {
      id: "terms",
      isChecked: model.isChecked,
      hasDescription: true,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label, description }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...checkbox], [Checkbox.mark({ isChecked: model.isChecked })]),
            h.div(
              [sx(styles.text)],
              [
                h.label([...label], ["I accept the terms"]),
                h.p([...description], ["You can read them again in your settings."]),
              ],
            ),
          ],
        ),
    },
    h,
  );
