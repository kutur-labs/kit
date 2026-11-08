import type { Html, HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import { ListboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import {
  listboxButton,
  listboxIndicator,
  listboxTheme,
} from "@kutur-kit/foldkit-stylex-theme/listbox";
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
    languages: Listbox.init({ id: "themed-language", isAnimated: true }),
    language: Option.none(),
    tags: Listbox.Multi.init({ id: "themed-tags", isAnimated: true }),
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
});

const languagesView = ListboxStyle.view(Languages.view, listboxTheme);

const tagsView = ListboxStyle.Multi.view(Tags.view, listboxTheme);

const button = (text: string, isOpen: boolean, h: HtmlBuilder<Message>) =>
  h.span(
    [sx(listboxButton.content)],
    [
      h.span([], [text]),
      h.span(
        [h.AriaHidden(true), sx(listboxIndicator.chevron, isOpen && listboxIndicator.open)],
        ["▾"],
      ),
    ],
  );

const item =
  (h: HtmlBuilder<Message>) => (value: string, state: Readonly<{ isSelected: boolean }>) => ({
    content: h.span(
      [],
      [
        h.span(
          [
            h.AriaHidden(true),
            sx(listboxIndicator.tick, state.isSelected && listboxIndicator.ticked),
          ],
          ["✓"],
        ),
        h.span([], [value]),
      ],
    ),
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
          buttonContent: button(
            Option.getOrElse(model.language, () => "Language"),
            model.languages.isOpen,
            h,
          ),
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
          buttonContent: button(
            Array.isReadonlyArrayNonEmpty(model.selectedTags)
              ? model.selectedTags.join(", ")
              : "Tags",
            model.tags.isOpen,
            h,
          ),
          itemToConfig: item(h),
        },
        toParentMessage: (message) => Message.GotTagsMessage({ message }),
      }),
    ],
  );
