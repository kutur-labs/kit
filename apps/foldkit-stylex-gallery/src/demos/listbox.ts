import type { Html, HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import { ListboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

const Language = Schema.Literals(["Polski", "English", "Deutsch", "Klingon"]);

type Language = typeof Language.Type;

const Tag = Schema.Literals(["Poetry", "Prose", "Zine"]);

type Tag = typeof Tag.Type;

const Languages = Listbox.create<Language>();

const Tags = Listbox.Multi.create<Tag>();

export const Model = Schema.Struct({
  languages: Listbox.Model,
  language: Schema.Option(Language),
  tags: Listbox.Multi.Model,
  selectedTags: Schema.Array(Tag),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotLanguagesMessage: { message: Listbox.Message },
  GotTagsMessage: { message: Listbox.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    languages: Listbox.init({ id: "language", isAnimated: true }),
    language: Option.none(),
    tags: Listbox.Multi.init({ id: "tags", isAnimated: true }),
    selectedTags: [],
  },
});

const toggled = (tags: ReadonlyArray<Tag>, tag: Tag) =>
  tags.includes(tag) ? tags.filter((current) => current !== tag) : [...tags, tag];

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotLanguagesMessage: ({ message }) => {
      const next = Languages.update(model.languages, message);

      return {
        model: {
          ...model,
          languages: next.model,
          language: next.outMessage ? Option.some(next.outMessage.value) : model.language,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotLanguagesMessage({ message }),
        ),
      };
    },
    GotTagsMessage: ({ message }) => {
      const next = Tags.update(model.tags, message);

      return {
        model: {
          ...model,
          tags: next.model,
          selectedTags: next.outMessage
            ? toggled(model.selectedTags, next.outMessage.value)
            : model.selectedTags,
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotTagsMessage({ message }),
        ),
      };
    },
  });

const styles = stylex.create({
  row: { display: "flex", flexWrap: "wrap", gap: 16, paddingBlockEnd: 200 },
  button: { minBlockSize: 44, minInlineSize: 160, font: "inherit" },
  buttonOpen: { outlineWidth: 2, outlineStyle: "solid" },
  // The list renders outside this view, in Foldkit's portal root, so it sets its own color. As wide
  // as the button, padding included.
  items: {
    boxSizing: "border-box",
    minInlineSize: 160,
    padding: 4,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
    transitionProperty: "opacity",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  itemsClosed: { opacity: 0 },
  // Floating UI caps the panel's height; this inner element scrolls.
  scroll: { maxBlockSize: 240, overflowY: "auto" },
  item: { display: "flex", alignItems: "center", minBlockSize: 44, paddingInline: 12 },
  itemActive: { backgroundColor: "gainsboro" },
  itemSelected: { fontWeight: 700 },
  itemDisabled: { opacity: 0.5 },
});

const listStyles = {
  button: (state) => [styles.button, state.isVisible && styles.buttonOpen],
  items: (state) => [styles.items, state.isClosed && styles.itemsClosed],
  itemsScroll: styles.scroll,
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isSelected && styles.itemSelected,
    state.isDisabled && styles.itemDisabled,
  ],
} satisfies ListboxStyle.Styles;

const languagesView = ListboxStyle.view(Languages.view, listStyles);

// Listbox.Multi takes the same styles through its own entry point.
const tagsView = ListboxStyle.Multi.view(Tags.view, listStyles);

const item = (h: HtmlBuilder<Message>) => (value: string) => ({
  content: h.span([], [value]),
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      h.submodel({
        slotId: "language",
        model: model.languages,
        view: languagesView,
        viewInputs: {
          items: Language.literals,
          maybeSelectedValue: model.language,
          isItemDisabled: (language) => language === "Klingon",
          ariaLabel: "Language",
          buttonContent: h.span([], [Option.getOrElse(model.language, () => "Language")]),
          itemToConfig: item(h),
        },
        toParentMessage: (message) => Message.GotLanguagesMessage({ message }),
      }),
      h.submodel({
        slotId: "tags",
        model: model.tags,
        view: tagsView,
        viewInputs: {
          items: Tag.literals,
          selectedValues: model.selectedTags,
          ariaLabel: "Tags",
          buttonContent: h.span(
            [],
            [
              Array.isReadonlyArrayNonEmpty(model.selectedTags)
                ? model.selectedTags.join(", ")
                : "Tags",
            ],
          ),
          itemToConfig: item(h),
        },
        toParentMessage: (message) => Message.GotTagsMessage({ message }),
      }),
    ],
  );
