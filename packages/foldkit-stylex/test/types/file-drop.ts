import type { Html, HtmlBuilder } from "foldkit/html";

import { FileDrop } from "@foldkit/ui";
import { FileDropStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotUploadMessage: { message: FileDrop.Message } });

type Message = typeof Message.Type;

// `toParentMessage` compiles only while the styled view keeps FileDrop's Message.
export const upload = (model: FileDrop.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: fileDropView,
    viewInputs: {
      accept: ["application/pdf"],
      toView: ({ root, input }) =>
        h.label([...root], [h.input([...input]), h.span([], ["Upuść plik PDF"])]),
    },
    toParentMessage: (message) => Message.GotUploadMessage({ message }),
  });

const styles = stylex.create({
  zone: {
    minBlockSize: 120,
    padding: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "gray",
    outlineStyle: { default: "none", ":has(:focus-visible)": "solid" },
  },
  over: { borderColor: "black", backgroundColor: "whitesmoke" },
  disabled: { opacity: 0.5 },
});

const fileDropView = FileDropStyle.view(FileDrop.view, {
  root: (state) => [
    styles.zone,
    state.isDragOver && styles.over,
    state.isDisabled && styles.disabled,
  ],
});
