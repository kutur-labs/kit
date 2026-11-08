import type { Html, HtmlBuilder } from "foldkit/html";

import { Fieldset } from "@foldkit/ui";
import { FieldsetStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ ClickedSubmit: {} });

type Message = typeof Message.Type;

// Fieldset takes no callback, so Message comes from the builder alone.
export const address = (isSending: boolean, h: HtmlBuilder<Message>): Html =>
  fieldsetView(
    {
      id: "address",
      isDisabled: isSending,
      toView: ({ fieldset, legend }) =>
        h.fieldset(
          [...fieldset],
          [
            h.legend([...legend], ["Address"]),
            h.button([h.OnClick(Message.ClickedSubmit())], ["Send"]),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  fieldset: { borderWidth: 0, padding: 0, margin: 0 },
  disabled: { opacity: 0.5 },
  legend: { fontWeight: 700 },
});

const fieldsetView = FieldsetStyle.view(Fieldset.view, {
  fieldset: (state) => [styles.fieldset, state.isDisabled && styles.disabled],
  legend: styles.legend,
});
