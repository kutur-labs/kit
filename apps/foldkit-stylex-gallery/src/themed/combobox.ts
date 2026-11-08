import type { Html, HtmlBuilder } from "foldkit/html";

import { Combobox } from "@foldkit/ui";
import { ComboboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import { comboboxIndicator, comboboxTheme } from "@kutur-kit/foldkit-stylex-theme/combobox";
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
    cities: Combobox.init({ id: "themed-city", isAnimated: true }),
    city: Option.none(),
    fairs: Combobox.Multi.init({ id: "themed-fairs", isAnimated: true }),
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
  wide: { minInlineSize: "20rem" },
});

const citiesView = ComboboxStyle.view(Cities.view, comboboxTheme);

// A layer over the look wins property by property: this field is wider than the look's, and its
// list, as wide as the field, follows.
const fairsView = ComboboxStyle.Multi.view(Fairs.view, comboboxTheme, {
  inputWrapper: styles.wide,
});

const chevron = (isOpen: boolean, h: HtmlBuilder<Message>) =>
  h.span([sx(comboboxIndicator.chevron, isOpen && comboboxIndicator.open)], ["▾"]);

const item =
  (h: HtmlBuilder<Message>) => (value: string, state: Readonly<{ isSelected: boolean }>) => ({
    content: h.span(
      [],
      [
        h.span(
          [
            h.AriaHidden(true),
            sx(comboboxIndicator.tick, state.isSelected && comboboxIndicator.ticked),
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
          buttonContent: chevron(model.cities.isOpen, h),
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
              buttonContent: chevron(model.fairs.isOpen, h),
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
