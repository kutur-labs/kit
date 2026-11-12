import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Tabs } from "@kutur-kit/foldkit-stylex-theme/tabs";
import { color, fontSize } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Switches between panels of one page.";

const Section = Schema.Literals(["Poems", "Notes", "Drafts"]);

type Section = typeof Section.Type;

const Sections = Tabs.create<Section>();

export const Model = Schema.Struct({ tabs: Tabs.Model, selected: Section });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ GotTabsMessage: { message: Tabs.Message } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: { tabs: Tabs.init({ id: "sections" }), selected: "Poems" },
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotTabsMessage: ({ message }) => {
      const next = Sections.update(model.tabs, message);

      return {
        model: { tabs: next.model, selected: next.outMessage?.value ?? model.selected },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotTabsMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  root: { inlineSize: "100%", maxInlineSize: "24rem" },
  text: { margin: 0, color: color.muted, fontSize: fontSize.md, lineHeight: "1.25rem" },
});

const texts = {
  Poems: "Twelve poems, the newest from last week.",
  Notes: "Notes on the second stanza and the ending.",
  Drafts: "Three drafts, none of them shared yet.",
} satisfies Record<Section, string>;

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "sections",
    model: model.tabs,
    view: Sections.view,
    viewInputs: {
      tabs: Section.literals,
      selectedValue: model.selected,
      ariaLabel: "Sections",
      panelMount: "All",
      toView: ({ tablist, tabs }) =>
        h.div(
          [sx(styles.root)],
          [
            h.div(
              [...tablist],
              tabs.map((tab) => h.button([...tab.tab], [tab.value])),
            ),
            ...tabs.map((tab) =>
              h.div([...tab.panel], [h.p([sx(styles.text)], [texts[tab.value]])]),
            ),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotTabsMessage({ message }),
  });
