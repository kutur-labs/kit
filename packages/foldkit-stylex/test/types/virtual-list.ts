import type { Html, HtmlBuilder } from "foldkit/html";

import { VirtualList } from "@foldkit/ui";
import { sx, VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotIssuesMessage: { message: VirtualList.Message } });

type Message = typeof Message.Type;

type Issue = Readonly<{ id: string; title: string }>;

const styles = stylex.create({
  container: { blockSize: 320, borderWidth: 1, borderStyle: "solid" },
  row: { paddingInline: 12, alignContent: "center" },
});

// `Item` comes from the view, so `itemToKey` and `itemToView` get an Issue.
const issuesView = VirtualListStyle.view(VirtualList.view<Issue>(), {
  container: styles.container,
});

export const issues = (
  model: VirtualList.Model,
  items: ReadonlyArray<Issue>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: issuesView,
    viewInputs: {
      items,
      itemToKey: (issue) => issue.id,
      itemToView: (issue) => h.div([sx(styles.row)], [issue.title]),
    },
    toParentMessage: (message) => Message.GotIssuesMessage({ message }),
  });
