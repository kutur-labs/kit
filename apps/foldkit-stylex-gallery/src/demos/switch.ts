import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Switch } from "@foldkit/ui";
import { SwitchStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ isChecked: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledNotifications: { isChecked: Schema.Boolean } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { isChecked: false } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledNotifications: ({ isChecked }) => ({ model: { isChecked } }),
  });

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: 8 },
  track: {
    display: "inline-flex",
    alignItems: "center",
    boxSizing: "border-box",
    inlineSize: 44,
    blockSize: 24,
    padding: 2,
    borderWidth: 0,
    borderRadius: 12,
    backgroundColor: "gray",
  },
  checked: { backgroundColor: "black" },
  disabled: { opacity: 0.5 },
  // The switch has no thumb part: this is the app's own element, moved from the model.
  thumb: {
    inlineSize: 20,
    blockSize: 20,
    borderRadius: "50%",
    backgroundColor: "white",
    transitionProperty: "margin-inline-start",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  // A logical margin, so the thumb slides toward the inline end in a right-to-left page too.
  on: { marginInlineStart: 20 },
});

const switchView = SwitchStyle.view(Switch.view, {
  button: (state) => [
    styles.track,
    state.isChecked && styles.checked,
    state.isDisabled && styles.disabled,
  ],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  switchView(
    {
      id: "notifications",
      isChecked: model.isChecked,
      onToggle: (isChecked) => Message.ToggledNotifications({ isChecked }),
      toView: ({ button, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...button], [h.span([sx(styles.thumb, model.isChecked && styles.on)], [])]),
            h.label([...label], ["Notifications"]),
          ],
        ),
    },
    h,
  );
