import type { Html, HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import { sx, VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import { virtualListRow, virtualListTheme } from "@kutur-kit/foldkit-stylex-theme/virtual-list";
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
  model: { virtualList: VirtualList.init({ id: "themed-issues", rowHeightPx: 44 }) },
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

type Issue = Readonly<{ number: number; isOpen: boolean }>;

const issues = Array.makeBy(10_000, (index): Issue => ({
  number: index + 1,
  isOpen: index % 3 > 0,
}));

const styles = stylex.create({
  // The app's own height and width, layered over the look's.
  container: { blockSize: "15rem", maxInlineSize: "24rem" },
});

const virtualListView = VirtualListStyle.view(VirtualList.view<Issue>(), virtualListTheme, {
  container: styles.container,
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "issues",
    model: model.virtualList,
    view: virtualListView,
    viewInputs: {
      items: issues,
      itemToKey: (issue) => String(issue.number),
      itemToView: (issue) =>
        h.div(
          [sx(virtualListRow.row)],
          [
            `Issue ${issue.number}`,
            h.span([sx(virtualListRow.detail)], [issue.isOpen ? "Open" : "Closed"]),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotVirtualListMessage({ message }),
  });
