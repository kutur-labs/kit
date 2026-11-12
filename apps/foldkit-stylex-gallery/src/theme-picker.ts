import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Listbox } from "@kutur-kit/foldkit-stylex-theme/listbox";
import { color, fontSize, space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Effect, Option, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { defineView } from "foldkit/submodel";

import { viewportPadding } from "./anchor.ts";
import { labelId, labelledBy } from "./field.ts";
import { media } from "./media.stylex.ts";
import { ApplyPreset, Preset } from "./presets.ts";

// Retheming at runtime: the picker writes color-scheme and --fks-* properties on <html>, where the
// theme's tokens read them, so the page and the panels @foldkit/ui portals to <body> follow at once.

/** `System` follows the operating system through the stylesheet's `color-scheme: light dark`. */
export const Scheme = Schema.Literals(["System", "Light", "Dark"]);

export type Scheme = typeof Scheme.Type;

export const Model = Schema.Struct({
  scheme: Scheme,
  preset: Preset,
  schemes: Listbox.Model,
  presets: Listbox.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotSchemesMessage: { message: Listbox.Message },
  GotPresetsMessage: { message: Listbox.Message },
  CompletedApplyScheme: {},
  CompletedApplyPreset: {},
});

export type Message = typeof Message.Type;

/** The server renders no inline style on <html>, so the picker starts at the stylesheet's values. */
export const init = (): Model => ({
  scheme: "System",
  preset: "Kit",
  schemes: Listbox.init({ id: "scheme", isAnimated: true }),
  presets: Listbox.init({ id: "tokens", isAnimated: true }),
});

const ApplyScheme = Command.define("ApplyScheme", {
  args: { scheme: Scheme },
  messages: [Message.CompletedApplyScheme],
  execute: ({ scheme }) =>
    Effect.sync(() => {
      document.documentElement.style.colorScheme = scheme === "System" ? "" : scheme.toLowerCase();

      return Message.CompletedApplyScheme();
    }),
});

const styles = stylex.create({
  // Below 40rem the pickers take a row of their own, half each.
  pickers: {
    display: "flex",
    gap: space.md,
    flexBasis: { default: "auto", [media.narrow]: "100%" },
  },
  picker: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    flexGrow: { default: 0, [media.narrow]: 1 },
    flexBasis: { default: "auto", [media.narrow]: 0 },
  },
  label: { color: color.muted, fontSize: fontSize.sm },
  wrapper: { flexGrow: 1 },
  // A fixed width, so choosing a shorter value moves nothing in the header.
  button: {
    inlineSize: { default: "6.5rem", [media.narrow]: "100%" },
    minInlineSize: 0,
    whiteSpace: "nowrap",
  },
});

const Picker = Listbox.restyle({ wrapper: styles.wrapper, button: styles.button });

const Schemes = Picker.create<Scheme>();

const Presets = Picker.create<Preset>();

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSchemesMessage: ({ message }) => {
      const next = Schemes.update(model.schemes, message);
      const chosen = Option.fromNullishOr(next.outMessage).pipe(Option.map(({ value }) => value));

      return {
        model: {
          ...model,
          schemes: next.model,
          scheme: Option.getOrElse(chosen, () => model.scheme),
        },
        commands: [
          ...Command.mapMessages(next.commands, (message) =>
            Message.GotSchemesMessage({ message }),
          ),
          ...Option.toArray(chosen).map((scheme) => ApplyScheme({ scheme })),
        ],
      };
    },
    GotPresetsMessage: ({ message }) => {
      const next = Presets.update(model.presets, message);
      const chosen = Option.fromNullishOr(next.outMessage).pipe(Option.map(({ value }) => value));

      return {
        model: {
          ...model,
          presets: next.model,
          preset: Option.getOrElse(chosen, () => model.preset),
        },
        commands: [
          ...Command.mapMessages(next.commands, (message) =>
            Message.GotPresetsMessage({ message }),
          ),
          ...Option.toArray(chosen).map((preset) =>
            Command.mapMessage(ApplyPreset({ preset }), () => Message.CompletedApplyPreset()),
          ),
        ],
      };
    },
    CompletedApplyScheme: () => ({ model }),
    CompletedApplyPreset: () => ({ model }),
  });

// The button's accessible name is the label, then the value the button shows.
const picker = <Value extends string>(
  values: ReadonlyArray<Value>,
  selected: Value,
  listbox: Listbox.Model,
) => ({
  items: values,
  maybeSelectedValue: Option.some(selected),
  ariaLabelledBy: labelledBy(Listbox.buttonId(listbox.id)),
  anchor: { placement: "bottom-end", gap: 4, padding: viewportPadding } as const,
  buttonContent: Listbox.buttonContent(selected, listbox),
  itemToConfig: (value: Value, state: Readonly<{ isSelected: boolean }>) => ({
    content: Listbox.itemContent(value, state),
  }),
});

const labelled = (name: string, listbox: Listbox.Model, h: HtmlBuilder<Message>, view: Html) =>
  h.div(
    [sx(styles.picker)],
    [
      h.label(
        [
          h.Id(labelId(Listbox.buttonId(listbox.id))),
          h.For(Listbox.buttonId(listbox.id)),
          sx(styles.label),
        ],
        [name],
      ),
      view,
    ],
  );

/** A color-scheme picker and a preset picker. */
export const view = defineView<Model, Message>((model, h) =>
  h.div(
    [sx(styles.pickers)],
    [
      labelled(
        "Scheme",
        model.schemes,
        h,
        h.submodel({
          slotId: "scheme",
          model: model.schemes,
          view: Schemes.view,
          viewInputs: picker(Scheme.literals, model.scheme, model.schemes),
          toParentMessage: (message) => Message.GotSchemesMessage({ message }),
        }),
      ),
      labelled(
        "Tokens",
        model.presets,
        h,
        h.submodel({
          slotId: "tokens",
          model: model.presets,
          view: Presets.view,
          viewInputs: picker(Preset.literals, model.preset, model.presets),
          toParentMessage: (message) => Message.GotPresetsMessage({ message }),
        }),
      ),
    ],
  ),
);
