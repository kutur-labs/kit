import { sx } from "@kutur-kit/foldkit-stylex";
import { Combobox } from "@kutur-kit/foldkit-stylex-theme/combobox";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";

import { viewportPadding } from "../anchor.ts";
import { field } from "../field.ts";

export const summary = "A text field that filters a list of choices as you type.";

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

const styles = stylex.create({
  row: { display: "flex", flexWrap: "wrap", alignItems: "start", gap: space.md },
  chosen: { margin: 0, color: color.muted, fontSize: fontSize.sm },
});

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

const itemToConfig = (value: string, state: Readonly<{ isSelected: boolean }>) => ({
  content: Combobox.itemContent(value, state),
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [sx(styles.row)],
    [
      field(h, { controlId: Combobox.inputId(model.cities.id), text: "City" }, [
        h.submodel({
          slotId: "city",
          model: model.cities,
          view: Cities.view,
          viewInputs: {
            items: matching(City.literals, model.cities.inputValue),
            maybeSelectedValue: model.city,
            restingInputValue: Option.getOrElse(model.city, () => ""),
            itemToValue: (city) => city,
            itemToDisplayText: (city) => city,
            itemGroupKey: regionOf,
            groupToHeading: (region) => ({ content: h.span([], [region]) }),
            anchor: { gap: 4, padding: viewportPadding },
            buttonContent: Combobox.buttonContent(model.cities),
            // @foldkit/ui leaves the toggle, which shows only a chevron, without a name; as in
            // WAI-ARIA's combobox pattern, it is named after its list.
            buttonAttributes: childAttributes([h.AriaLabel("Cities")]),
            itemToConfig,
          },
          toParentMessage: (message) => Message.GotCitiesMessage({ message }),
        }),
      ]),
      field(h, { controlId: Combobox.inputId(model.fairs.id), text: "Fairs" }, [
        h.submodel({
          slotId: "fairs",
          model: model.fairs,
          view: Fairs.view,
          viewInputs: {
            items: matching(Fair.literals, model.fairs.inputValue),
            selectedValues: model.selectedFairs,
            restingInputValue: "",
            itemToValue: (fair) => fair,
            itemToDisplayText: (fair) => fair,
            anchor: { gap: 4, padding: viewportPadding },
            buttonContent: Combobox.buttonContent(model.fairs),
            buttonAttributes: childAttributes([h.AriaLabel("Fairs")]),
            itemToConfig,
          },
          toParentMessage: (message) => Message.GotFairsMessage({ message }),
        }),
        h.p(
          [sx(styles.chosen)],
          [
            Array.isReadonlyArrayNonEmpty(model.selectedFairs)
              ? model.selectedFairs.join(", ")
              : "No fairs chosen",
          ],
        ),
      ]),
    ],
  );
