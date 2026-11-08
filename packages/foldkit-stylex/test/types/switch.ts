import type { Html, HtmlBuilder } from "foldkit/html";

import { Switch } from "@foldkit/ui";
import { SwitchStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onToggle alone would reject the builder.
const Message = defineMessageUnion({
  ToggledAlerts: { isChecked: Schema.Boolean },
  ClickedSave: {},
});

type Message = typeof Message.Type;

export const alerts = (isChecked: boolean, h: HtmlBuilder<Message>): Html =>
  switchView(
    {
      id: "alerts",
      isChecked,
      onToggle: (isChecked) => Message.ToggledAlerts({ isChecked }),
      toView: ({ button, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...button], [h.span([sx(styles.thumb, isChecked && styles.thumbOn)], [])]),
            h.label([...label], ["Email alerts"]),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  track: {
    display: "flex",
    inlineSize: 44,
    blockSize: 24,
    padding: 2,
    borderRadius: 12,
    backgroundColor: "gainsboro",
  },
  on: { backgroundColor: "black" },
  readOnly: { cursor: "default" },
  thumb: {
    inlineSize: 20,
    blockSize: 20,
    borderRadius: "50%",
    backgroundColor: "white",
    transitionProperty: "translate",
    transitionDuration: "150ms",
  },
  thumbOn: { translate: "20px 0" },
});

const switchView = SwitchStyle.view(Switch.view, {
  button: (state) => [
    styles.track,
    state.isChecked && styles.on,
    state.isReadOnly && styles.readOnly,
  ],
});
