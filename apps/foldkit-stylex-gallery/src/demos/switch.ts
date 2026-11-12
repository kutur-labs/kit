import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Switch } from "@kutur-kit/foldkit-stylex-theme/switch";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Turns a setting on or off at once.";

const Setting = Schema.Literals(["notifications", "cleanup"]);

type Setting = typeof Setting.Type;

export const Model = Schema.Struct({ notifications: Schema.Boolean, cleanup: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  ToggledSetting: { setting: Setting, isChecked: Schema.Boolean },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { notifications: true, cleanup: false },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledSetting: ({ setting, isChecked }) => ({ model: { ...model, [setting]: isChecked } }),
  });

const styles = stylex.create({
  list: { display: "grid", gap: space.lg },
  // The track centres itself on the label's first line, so the row aligns to the start.
  row: { display: "flex", alignItems: "flex-start", gap: space.md },
  // A grid, so the label and description stack.
  text: { display: "grid", gap: "0.125rem" },
});

const labels = {
  notifications: {
    label: "Notifications",
    description: "Email me when someone replies.",
  },
  cleanup: {
    label: "Delete old drafts",
    description: "Drafts untouched for 30 days are deleted for good.",
  },
} satisfies Record<Setting, Readonly<{ label: string; description: string }>>;

const setting = (name: Setting, model: Model, h: HtmlBuilder<Message>): Html =>
  Switch.view(
    {
      id: name,
      isChecked: model[name],
      hasDescription: true,
      onToggle: (isChecked) => Message.ToggledSetting({ setting: name, isChecked }),
      toView: ({ button, label, description }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...button], []),
            h.div(
              [sx(styles.text)],
              [
                h.label([...label], [labels[name].label]),
                h.span([...description], [labels[name].description]),
              ],
            ),
          ],
        ),
    },
    h,
  );

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.list)],
    Setting.literals.map((name) => setting(name, model, h)),
  );
