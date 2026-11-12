import { sx } from "@kutur-kit/foldkit-stylex";
import { VirtualList } from "@kutur-kit/foldkit-stylex-theme/virtual-list";
import * as stylex from "@stylexjs/stylex";
import { Array, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Renders only the rows of a long list that are in view.";

export const Model = Schema.Struct({ virtualList: VirtualList.Model });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotVirtualListMessage: { message: VirtualList.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { virtualList: VirtualList.init({ id: "issues", rowHeightPx: 36 }) },
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
  // The app's own height and width, layered over the theme's.
  container: { blockSize: "15rem", inlineSize: "100%", maxInlineSize: "24rem" },
});

const issuesView = VirtualList.restyle({ container: styles.container }).view<Issue>();

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "issues",
    model: model.virtualList,
    view: issuesView,
    viewInputs: {
      // A scroller of plain rows takes focus itself, so the keyboard can scroll it, and its name
      // says what a screen reader enters.
      containerAttributes: childAttributes([h.Tabindex(0), h.AriaLabel("Issues")]),
      items: issues,
      itemToKey: (issue) => String(issue.number),
      itemToView: (issue) =>
        h.div(
          [sx(VirtualList.row.body)],
          [
            `Issue ${issue.number}`,
            h.span([sx(VirtualList.row.detail)], [issue.isOpen ? "Open" : "Closed"]),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotVirtualListMessage({ message }),
  });
