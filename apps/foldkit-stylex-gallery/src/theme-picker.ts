import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { Effect, Schema } from "effect";
import { Command, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { defineView } from "foldkit/submodel";

import { ApplyPreset, Preset } from "./presets.ts";

// Retheming at runtime: the picker writes color-scheme and --fks-* properties on <html>, where the
// theme's tokens read them, so the page and the panels @foldkit/ui portals to <body> follow at once.

/** `System` follows the operating system through the stylesheet's `color-scheme: light dark`. */
export const Scheme = Schema.Literals(["System", "Light", "Dark"]);

export type Scheme = typeof Scheme.Type;

export const Model = Schema.Struct({ scheme: Scheme, preset: Preset });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  SelectedScheme: { scheme: Scheme },
  SelectedPreset: { preset: Preset },
  CompletedApplyScheme: {},
  CompletedApplyPreset: {},
});

export type Message = typeof Message.Type;

/** The server renders no inline style on <html>, so the picker starts at the stylesheet's values. */
export const init = (): Model => ({ scheme: "System", preset: "Kit" });

const ApplyScheme = Command.define("ApplyScheme", {
  args: { scheme: Scheme },
  messages: [Message.CompletedApplyScheme],
  execute: ({ scheme }) =>
    Effect.sync(() => {
      document.documentElement.style.colorScheme = scheme === "System" ? "" : scheme.toLowerCase();

      return Message.CompletedApplyScheme();
    }),
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    SelectedScheme: ({ scheme }) => ({
      model: { ...model, scheme },
      commands: [ApplyScheme({ scheme })],
    }),
    SelectedPreset: ({ preset }) => ({
      model: { ...model, preset },
      commands: [Command.mapMessage(ApplyPreset({ preset }), () => Message.CompletedApplyPreset())],
    }),
    CompletedApplyScheme: () => ({ model }),
    CompletedApplyPreset: () => ({ model }),
  });

const styles = stylex.create({
  picker: { display: "flex", flexWrap: "wrap", gap: 16 },
  group: { display: "flex", alignItems: "center", gap: 4, margin: 0, padding: 0, borderWidth: 0 },
  legend: { float: "inline-start", marginInlineEnd: 8 },
  option: {
    minBlockSize: 44,
    minInlineSize: 44,
    paddingInline: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "ButtonBorder",
    borderRadius: 4,
    backgroundColor: "ButtonFace",
    color: "ButtonText",
    font: "inherit",
  },
  pressed: { backgroundColor: "Highlight", color: "HighlightText", borderColor: "Highlight" },
});

const choices = <Value extends string>(
  legend: string,
  values: ReadonlyArray<Value>,
  current: Value,
  toMessage: (value: Value) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.fieldset(
    [sx(styles.group)],
    [
      h.legend([sx(styles.legend)], [legend]),
      ...values.map((value) =>
        h.button(
          [
            h.Type("button"),
            h.AriaPressed(String(value === current)),
            h.OnClick(toMessage(value)),
            sx(styles.option, value === current && styles.pressed),
          ],
          [value],
        ),
      ),
    ],
  );

/** A color-scheme switch and a preset switch. */
export const view = defineView<Model, Message>((model, h) =>
  h.div(
    [sx(styles.picker)],
    [
      choices(
        "Scheme",
        Scheme.literals,
        model.scheme,
        (scheme) => Message.SelectedScheme({ scheme }),
        h,
      ),
      choices(
        "Tokens",
        Preset.literals,
        model.preset,
        (preset) => Message.SelectedPreset({ preset }),
        h,
      ),
    ],
  ),
);
