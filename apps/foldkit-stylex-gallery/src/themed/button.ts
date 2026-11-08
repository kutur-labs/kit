import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Button } from "@foldkit/ui";
import { ButtonStyle, sx } from "@kutur-kit/foldkit-stylex";
import { buttonTheme } from "@kutur-kit/foldkit-stylex-theme/button";
import { color, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ count: Schema.Int });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ClickedAdd: {}, ClickedReset: {} });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { count: 0 } });

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAdd: () => ({ model: { count: model.count + 1 } }),
    ClickedReset: () => ({ model: { count: 0 } }),
  });

const styles = stylex.create({
  row: { display: "flex", alignItems: "center", gap: space.sm },
  // The app's own primary button: these properties replace the look's, the rest stay.
  primary: { borderColor: color.accent, backgroundColor: color.accent, color: color.onAccent },
});

const buttonView = ButtonStyle.view(Button.view, buttonTheme);

const primaryView = ButtonStyle.view(Button.view, buttonTheme, { button: styles.primary });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      primaryView(
        {
          onClick: Message.ClickedAdd(),
          toView: ({ button }) => h.button([...button], ["Add one"]),
        },
        h,
      ),
      buttonView(
        {
          onClick: Message.ClickedReset(),
          isDisabled: model.count === 0,
          toView: ({ button }) => h.button([...button], ["Reset"]),
        },
        h,
      ),
      h.output([], [`Count: ${model.count}`]),
    ],
  );
