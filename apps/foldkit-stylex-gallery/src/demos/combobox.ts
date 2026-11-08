import type { Html, HtmlBuilder } from "foldkit/html";

import { Combobox } from "@foldkit/ui";
import { ComboboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

// Listed by region, so each region's cities sit together under one heading.
const City = Schema.Literals(["Gdańsk", "Szczecin", "Poznań", "Warszawa", "Kraków", "Wrocław"]);

type City = typeof City.Type;

const regionOf = (city: City) =>
  city === "Gdańsk" || city === "Szczecin"
    ? "North"
    : city === "Poznań" || city === "Warszawa"
      ? "Centre"
      : "South";

const Fair = Schema.Literals(["Comics", "Poetry", "Prints", "Zines"]);

type Fair = typeof Fair.Type;

const Cities = Combobox.create<City>();

const Fairs = Combobox.Multi.create<Fair>();

export const Model = Schema.Struct({
  cities: Combobox.Model,
  city: Schema.Option(City),
  fairs: Combobox.Multi.Model,
  selectedFairs: Schema.Array(Fair),
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotCitiesMessage: { message: Combobox.Message },
  GotFairsMessage: { message: Combobox.Message },
});

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({
  model: {
    cities: Combobox.init({ id: "city", isAnimated: true }),
    city: Option.none(),
    fairs: Combobox.Multi.init({ id: "fairs", isAnimated: true }),
    selectedFairs: [],
  },
});

// ClearedSelection fires only for nullable comboboxes, which these are not.
const selectedOf = <Item extends string>(outMessage: Combobox.OutMessage<Item> | undefined) =>
  outMessage?._tag === "Selected" ? Option.some(outMessage.value) : Option.none();

const toggled = (fairs: ReadonlyArray<Fair>, fair: Fair) =>
  fairs.includes(fair) ? fairs.filter((current) => current !== fair) : [...fairs, fair];

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotCitiesMessage: ({ message }) => {
      const next = Cities.update(model.cities, message);

      return {
        model: {
          ...model,
          cities: next.model,
          city: Option.orElse(selectedOf(next.outMessage), () => model.city),
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotCitiesMessage({ message }),
        ),
      };
    },
    GotFairsMessage: ({ message }) => {
      const next = Fairs.update(model.fairs, message);

      return {
        model: {
          ...model,
          fairs: next.model,
          selectedFairs: Option.match(selectedOf(next.outMessage), {
            onNone: () => model.selectedFairs,
            onSome: (fair) => toggled(model.selectedFairs, fair),
          }),
        },
        commands: Command.mapMessages(next.commands, (message) =>
          Message.GotFairsMessage({ message }),
        ),
      };
    },
  });

// The items whose name contains what the user typed, in their order.
const matching = <Item extends string>(items: ReadonlyArray<Item>, typed: string) =>
  items.filter((item) => item.toLowerCase().includes(typed.trim().toLowerCase()));

const styles = stylex.create({
  row: { display: "flex", flexWrap: "wrap", alignItems: "start", gap: 16, paddingBlockEnd: 320 },
  field: { display: "grid", gap: 8 },
  // The toggle button lies over the input's end.
  inputWrapper: { position: "relative", display: "inline-flex" },
  input: { minBlockSize: 44, minInlineSize: 200, paddingInlineEnd: 44, font: "inherit" },
  button: {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: 0,
    inlineSize: 44,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
  },
  // The list renders outside this view, in Foldkit's portal root, so it sets its own color.
  items: {
    minInlineSize: "var(--button-width)",
    padding: 4,
    backgroundColor: "white",
    color: "black",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
    transitionProperty: "opacity",
    transitionDuration: { default: "150ms", "@media (prefers-reduced-motion: reduce)": "0s" },
  },
  itemsClosed: { opacity: 0 },
  item: { display: "flex", alignItems: "center", minBlockSize: 44, paddingInline: 12 },
  itemActive: { backgroundColor: "gainsboro" },
  itemSelected: { fontWeight: 700 },
  itemDisabled: { opacity: 0.5 },
  heading: { paddingBlock: 4, paddingInline: 12, fontSize: 14, fontWeight: 700 },
  // @foldkit/ui renders a separator between groups only when this part is styled.
  separator: { blockSize: 1, marginBlock: 4, backgroundColor: "silver" },
});

const comboboxStyles = {
  inputWrapper: styles.inputWrapper,
  input: styles.input,
  button: styles.button,
  items: (state) => [styles.items, state.isClosed && styles.itemsClosed],
  item: (state) => [
    styles.item,
    state.isActive && styles.itemActive,
    state.isSelected && styles.itemSelected,
    state.isDisabled && styles.itemDisabled,
  ],
  heading: styles.heading,
  separator: styles.separator,
} satisfies ComboboxStyle.Styles;

const citiesView = ComboboxStyle.view(Cities.view, comboboxStyles);

// Combobox.Multi takes the same styles through its own entry point.
const fairsView = ComboboxStyle.Multi.view(Fairs.view, comboboxStyles);

const item = (h: HtmlBuilder<Message>) => (value: string) => ({
  content: h.span([], [value]),
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      h.submodel({
        slotId: "city",
        model: model.cities,
        view: citiesView,
        viewInputs: {
          items: matching(City.literals, model.cities.inputValue),
          maybeSelectedValue: model.city,
          restingInputValue: Option.getOrElse(model.city, () => ""),
          itemToValue: (city) => city,
          itemToDisplayText: (city) => city,
          isItemDisabled: (city) => city === "Szczecin",
          itemGroupKey: regionOf,
          groupToHeading: (region) => ({ content: h.span([], [region]) }),
          ariaLabel: "City",
          inputPlaceholder: "City",
          buttonContent: h.span([], ["▾"]),
          itemToConfig: item(h),
        },
        toParentMessage: (message) => Message.GotCitiesMessage({ message }),
      }),
      h.div(
        [sx(styles.field)],
        [
          h.submodel({
            slotId: "fairs",
            model: model.fairs,
            view: fairsView,
            viewInputs: {
              items: matching(Fair.literals, model.fairs.inputValue),
              selectedValues: model.selectedFairs,
              restingInputValue: "",
              itemToValue: (fair) => fair,
              itemToDisplayText: (fair) => fair,
              ariaLabel: "Fairs",
              inputPlaceholder: "Fairs",
              itemToConfig: item(h),
            },
            toParentMessage: (message) => Message.GotFairsMessage({ message }),
          }),
          h.p(
            [],
            [
              Array.isReadonlyArrayNonEmpty(model.selectedFairs)
                ? model.selectedFairs.join(", ")
                : "No fairs chosen",
            ],
          ),
        ],
      ),
    ],
  );
