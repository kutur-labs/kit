import type { Html, HtmlBuilder } from "foldkit/html";

import { Combobox } from "@foldkit/ui";
import { ComboboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotCityMessage: { message: Combobox.Message } });

type Message = typeof Message.Type;

type City = "waw" | "krk" | "gdn";

/** Declared once at module scope, as @foldkit/ui asks. */
export const CityCombobox = Combobox.create<City>();

// Indexing by `city` compiles only while ComboboxStyle.view infers Item as City, not string.
const names: Readonly<Record<City, string>> = {
  waw: "Warszawa",
  krk: "Kraków",
  gdn: "Gdańsk",
};

export const city = (
  model: Combobox.Model,
  selected: Option.Option<City>,
  isInvalid: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: cityView,
    viewInputs: {
      items: ["waw", "krk", "gdn"],
      maybeSelectedValue: selected,
      restingInputValue: Option.match(selected, { onNone: () => "", onSome: (c) => names[c] }),
      itemToValue: (c) => c,
      itemToDisplayText: (c) => names[c],
      isInvalid,
      inputPlaceholder: "Miasto",
      anchor: { placement: "bottom-start", gap: 4 },
      buttonContent: h.span([], ["▾"]),
      itemToConfig: (c, state) => ({
        content: h.span(
          [sx(styles.option)],
          [h.span([sx(styles.check, state.isSelected && styles.checked)], ["✓"]), names[c]],
        ),
      }),
    },
    toParentMessage: (message) => Message.GotCityMessage({ message }),
  });

const styles = stylex.create({
  inputWrapper: { display: "flex", alignItems: "center", borderWidth: 1, borderStyle: "solid" },
  inputWrapperInvalid: { borderColor: "crimson" },
  input: { minBlockSize: 44, paddingInline: 12, borderWidth: 0 },
  inputOpen: { fontWeight: 700 },
  inputReadOnly: { cursor: "default" },
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

const cityView = ComboboxStyle.view(CityCombobox.view, {
  inputWrapper: (state) => [styles.inputWrapper, state.isInvalid && styles.inputWrapperInvalid],
  input: (state) => [
    styles.input,
    state.isVisible && styles.inputOpen,
    state.isReadOnly && styles.inputReadOnly,
  ],
  items: (state) => [styles.panel, state.isClosed && styles.panelClosed],
  itemsScroll: styles.scroll,
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isDisabled && styles.itemDisabled,
  ],
});

// Combobox.Multi takes the same styles through its own entry point.
export const Cities = Combobox.Multi.create<City>();

const citiesView = ComboboxStyle.Multi.view(Cities.view, {
  item: (state) => [styles.item, state.isSelected && styles.checked],
});

export const cities = (
  model: Combobox.Multi.Model,
  selected: ReadonlyArray<City>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: citiesView,
    viewInputs: {
      items: ["waw", "krk", "gdn"],
      selectedValues: selected,
      restingInputValue: "",
      itemToValue: (c) => c,
      itemToDisplayText: (c) => names[c],
      itemToConfig: (c, state) => ({
        content: h.span([sx(state.isActive && styles.itemActive)], [names[c]]),
      }),
    },
    toParentMessage: (message) => Message.GotCityMessage({ message }),
  });
