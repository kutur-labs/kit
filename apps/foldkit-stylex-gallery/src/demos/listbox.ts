import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Listbox } from "@kutur-kit/foldkit-stylex-theme/listbox";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";
import { field, labelledBy } from "../field.ts";

export const summary = "A button that opens a list to choose one value, or several.";

const Language = Schema.Literals(["Polski", "English", "Deutsch", "Čeština"]);

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
  row: { display: "flex", flexWrap: "wrap", gap: space.md },
});

const itemToConfig = (value: string, state: Readonly<{ isSelected: boolean }>) => ({
  content: Listbox.itemContent(value, state),
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      field(h, { controlId: Listbox.buttonId(model.languages.id), text: "Language" }, [
        h.submodel({
          slotId: "language",
          model: model.languages,
          view: Languages.view,
          viewInputs: {
            items: Language.literals,
            maybeSelectedValue: model.language,
            ariaLabelledBy: labelledBy(Listbox.buttonId(model.languages.id)),
            anchor: { gap: 4, padding: viewportPadding },
            buttonContent: Listbox.buttonContent(
              Option.match(model.language, {
                onNone: () => Listbox.placeholder("None"),
                onSome: (language) => language,
              }),
              model.languages,
            ),
            itemToConfig,
          },
          toParentMessage: (message) => Message.GotLanguagesMessage({ message }),
        }),
      ]),
      field(h, { controlId: Listbox.buttonId(model.tags.id), text: "Tags" }, [
        h.submodel({
          slotId: "tags",
          model: model.tags,
          view: Tags.view,
          viewInputs: {
            items: Tag.literals,
            selectedValues: model.selectedTags,
            ariaLabelledBy: labelledBy(Listbox.buttonId(model.tags.id)),
            anchor: { gap: 4, padding: viewportPadding },
            buttonContent: Listbox.buttonContent(
              Array.isReadonlyArrayNonEmpty(model.selectedTags)
                ? model.selectedTags.join(", ")
                : Listbox.placeholder("None"),
              model.tags,
            ),
            itemToConfig,
          },
          toParentMessage: (message) => Message.GotTagsMessage({ message }),
        }),
      ]),
    ],
  );
