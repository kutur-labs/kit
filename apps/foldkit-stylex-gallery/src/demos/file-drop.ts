import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { FileDrop } from "@kutur-kit/foldkit-stylex-theme/file-drop";
import { fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Predicate, Schema } from "effect";
import { Command, File, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Takes files dropped on it or chosen in the file picker.";

export const Model = Schema.Struct({
  fileDrop: FileDrop.Model,
  fileNames: Schema.Array(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotFileDropMessage: { message: FileDrop.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { fileDrop: FileDrop.init({ id: "attachments" }), fileNames: [] },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotFileDropMessage: ({ message }) => {
      const next = FileDrop.update(model.fileDrop, message);

      const received = Predicate.isTagged(next.outMessage, "ReceivedFiles")
        ? next.outMessage.files.map(File.name)
        : [];

      return {
        model: { fileDrop: next.model, fileNames: [...model.fileNames, ...received] },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotFileDropMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  root: { display: "grid", gap: space.sm, inlineSize: "100%", maxInlineSize: "24rem" },
  files: { margin: 0, paddingInlineStart: space.lg, fontSize: fontSize.sm },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      h.submodel({
        slotId: "attachments",
        model: model.fileDrop,
        view: FileDrop.view,
        viewInputs: {
          multiple: true,
          accept: ["image/*", ".pdf"],
          toView: ({ root, input }) =>
            h.label(
              [...root],
              [
                h.p([sx(FileDrop.text.title)], ["Drop scans here or choose them"]),
                h.p([sx(FileDrop.text.hint)], ["Images or PDF"]),
                h.input([...input]),
              ],
            ),
        },
        toParentMessage: (message) => Message.GotFileDropMessage({ message }),
      }),
      h.ul(
        [sx(styles.files)],
        model.fileNames.map((name) => h.li([], [name])),
      ),
    ],
  );
