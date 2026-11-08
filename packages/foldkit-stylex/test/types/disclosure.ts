import type { Html, HtmlBuilder } from "foldkit/html";

import { Disclosure } from "@foldkit/ui";
import { DisclosureStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

// Two variants, so a wrapper that inferred Message from onToggle alone would reject the builder.
const Message = defineMessageUnion({
  ToggledNotes: { isOpen: Schema.Boolean },
  ClickedSave: {},
});

type Message = typeof Message.Type;

export const notes = (isOpen: boolean, h: HtmlBuilder<Message>): Html =>
  disclosureView(
    {
      id: "notes",
      isOpen,
      onToggle: (isOpen) => Message.ToggledNotes({ isOpen }),
      toView: ({ button, panel, animatePanel }) =>
        h.div(
          [],
          [
            h.button(
              [...button],
              ["Shipping", h.span([sx(styles.chevron, isOpen && styles.chevronOpen)], ["▾"])],
            ),
            animatePanel(h.div([...panel], ["Shipping takes two days."])),
          ],
        ),
    },
    h,
  );

const styles = stylex.create({
  button: { display: "flex", justifyContent: "space-between", minBlockSize: 44 },
  open: { fontWeight: 700 },
  chevron: { transitionProperty: "rotate", transitionDuration: "200ms" },
  chevronOpen: { rotate: "180deg" },
  panel: { paddingBlock: 8 },
});

const disclosureView = DisclosureStyle.view(Disclosure.view, {
  button: (state) => [styles.button, state.isOpen && styles.open],
  panel: styles.panel,
});
