import type { Html, HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import { ListboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";

import { Message } from "./message.ts";

type Language = "pl" | "en";

/** Declared once at module scope, as @foldkit/ui asks. */
export const LanguageListbox = Listbox.create<Language>();

const languageName = (language: Language) => (language === "pl" ? "Polski" : "English");

export const language = (model: Listbox.Model, selected: Language, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: listboxView,
    viewInputs: {
      items: ["pl", "en"],
      maybeSelectedValue: Option.some(selected),
      anchor: { placement: "bottom-start", gap: 4 },
      buttonContent: h.span([], [languageName(selected)]),
      itemToConfig: (item, state) => ({
        content: h.span(
          [sx(styles.option)],
          [
            h.span([sx(styles.check, state.isSelected && styles.checked)], ["✓"]),
            languageName(item),
          ],
        ),
      }),
    },
    toParentMessage: (message) => Message.GotLanguageMessage({ message }),
  });

const styles = stylex.create({
  button: { minBlockSize: 44, paddingInline: 12 },
  buttonOpen: { fontWeight: 700 },
  panel: {
    minInlineSize: "var(--button-width)",
    backgroundColor: "white",
    color: "black",
    transitionProperty: "opacity",
    transitionDuration: "120ms",
  },
  panelClosed: { opacity: 0 },
  scroll: { maxBlockSize: "min(16rem, 60vh)", overflowY: "auto" },
  item: { minBlockSize: 44, paddingInline: 12, display: "flex", alignItems: "center" },
  itemActive: { backgroundColor: "whitesmoke" },
  itemDisabled: { opacity: 0.5 },
  option: { display: "flex", alignItems: "center", gap: 8 },
  check: { opacity: 0 },
  checked: { opacity: 1 },
});

const listboxView = ListboxStyle.view(LanguageListbox.view, {
  button: (state) => [styles.button, state.isVisible && styles.buttonOpen],
  items: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  itemsScroll: styles.scroll,
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isDisabled && styles.itemDisabled,
  ],
});

// Listbox.Multi takes the same styles through its own entry point.
type Tag = "a" | "b";

export const Tags = Listbox.Multi.create<Tag>();

const tagsView = ListboxStyle.Multi.view(Tags.view, {
  item: (state) => [styles.item, state.isSelected && styles.checked],
});

export const tags = (
  model: Listbox.Multi.Model,
  selected: ReadonlyArray<Tag>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: tagsView,
    viewInputs: {
      items: ["a", "b"],
      selectedValues: selected,
      buttonContent: h.span([], ["tags"]),
      itemToConfig: (item, state) => ({
        content: h.span([sx(state.isActive && styles.itemActive)], [item]),
      }),
    },
    toParentMessage: (message) => Message.GotLanguageMessage({ message }),
  });

// Object items still require itemToValue.
type City = Readonly<{ id: "waw" | "krk"; name: string }>;

export const Cities = Listbox.create<City, City["id"]>();

const citiesView = ListboxStyle.view(Cities.view, { item: styles.item });

export const cities = (model: Listbox.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: citiesView,
    viewInputs: {
      items: [{ id: "waw", name: "Warszawa" }],
      maybeSelectedValue: Option.none(),
      itemToValue: (city) => city.id,
      buttonContent: h.span([], ["city"]),
      itemToConfig: (city) => ({ content: h.span([], [city.name]) }),
    },
    toParentMessage: (message) => Message.GotLanguageMessage({ message }),
  });
