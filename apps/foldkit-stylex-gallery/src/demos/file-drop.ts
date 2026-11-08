import type { Html, HtmlBuilder } from "foldkit/html";

import { FileDrop } from "@foldkit/ui";
import { FileDropStyle, sx } from "@kutur-kit/foldkit-stylex";
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
  root: { display: "grid", gap: 8, maxInlineSize: 360 },
  // Positioned and centring its items, so the visually hidden input sits in the middle of the zone.
  zone: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    paddingBlock: 32,
    paddingInline: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "gray",
    cursor: "pointer",
    // The input inside takes keyboard focus, so the zone shows it.
    outlineStyle: { default: "none", ":has(:focus-visible)": "solid" },
    outlineWidth: 2,
    outlineOffset: 2,
  },
  over: { borderStyle: "solid", borderColor: "black", backgroundColor: "whitesmoke" },
  text: { margin: 0 },
});

const fileDropView = FileDropStyle.view(FileDrop.view, {
  root: (state) => [styles.zone, state.isDragOver && styles.over],
});

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
          toView: ({ root, input }) =>
            h.label(
              [...root],
              [h.p([sx(styles.text)], ["Drop files or choose them"]), h.input([...input])],
            ),
        },
        toParentMessage: (message) => Message.GotFileDropMessage({ message }),
      }),
      h.ul(
        [],
        model.fileNames.map((name) => h.li([], [name])),
      ),
    ],
  );
