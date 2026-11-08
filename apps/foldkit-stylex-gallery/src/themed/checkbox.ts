import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import { checkboxIndicator, checkboxTheme } from "@kutur-kit/foldkit-stylex-theme/checkbox";
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
  row: { display: "flex", alignItems: "center", gap: 12 },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, checkboxTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  checkboxView(
    {
      id: "themed-terms",
      isChecked: model.isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button(
              [...checkbox],
              [
                h.span(
                  [sx(checkboxIndicator.tick, model.isChecked && checkboxIndicator.ticked)],
                  ["✓"],
                ),
              ],
            ),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );
