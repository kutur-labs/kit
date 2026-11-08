import type { Html, HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import { sx, VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Model = Schema.Struct({ virtualList: VirtualList.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotVirtualListMessage: { message: VirtualList.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { virtualList: VirtualList.init({ id: "issues", rowHeightPx: 44 }) },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotVirtualListMessage: ({ message }) => {
      const next = VirtualList.update(model.virtualList, message);

      return {
        model: { virtualList: next.model },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotVirtualListMessage({ message }),
        ),
      };
    },
  });

const issues = Array.makeBy(10_000, (index) => `Issue ${index + 1}`);

const styles = stylex.create({
  // @foldkit/ui scrolls the container; a bounded height gives it something to scroll.
  container: { blockSize: 240, maxInlineSize: 360, borderWidth: 1, borderStyle: "solid" },
  // What itemToView returns fills the row @foldkit/ui sizes.
  row: {
    display: "flex",
    alignItems: "center",
    paddingInline: 12,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: "gainsboro",
  },
});

const virtualListView = VirtualListStyle.view(VirtualList.view<string>(), {
  container: styles.container,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "issues",
    model: model.virtualList,
    view: virtualListView,
    viewInputs: {
      items: issues,
      itemToKey: (issue) => issue,
      itemToView: (issue) => h.div([sx(styles.row)], [issue]),
    },
    toParentMessage: (message) => Message.GotVirtualListMessage({ message }),
  });
