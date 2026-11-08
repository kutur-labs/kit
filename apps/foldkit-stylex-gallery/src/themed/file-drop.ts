import type { Html, HtmlBuilder } from "foldkit/html";

import { FileDrop } from "@foldkit/ui";
import { FileDropStyle, sx } from "@kutur-kit/foldkit-stylex";
import { fileDropText, fileDropTheme } from "@kutur-kit/foldkit-stylex-theme/file-drop";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Predicate, Schema } from "effect";
import { Command, File, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({
  fileDrop: FileDrop.Model,
  fileNames: Schema.Array(Schema.String),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotFileDropMessage: { message: FileDrop.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { fileDrop: FileDrop.init({ id: "themed-attachments" }), fileNames: [] },
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
  root: { display: "grid", gap: space.sm, maxInlineSize: "24rem" },
  // A token set on the part: the zone's dashed edge takes the accent before any drag.
  inked: { [color.control]: color.accent },
  files: { margin: 0, paddingInlineStart: space.lg, fontSize: fontSize.sm },
});

const fileDropView = FileDropStyle.view(FileDrop.view, fileDropTheme, { root: styles.inked });

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.root)],
    [
      h.submodel({
        slotId: "attachments",
        model: model.fileDrop,
        view: fileDropView,
        viewInputs: {
          multiple: true,
          accept: ["image/*", ".pdf"],
          toView: ({ root, input }) =>
            h.label(
              [...root],
              [
                h.p([sx(fileDropText.title)], ["Drop scans here or choose them"]),
                h.p([sx(fileDropText.hint)], ["Images or PDF"]),
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
