# @kutur-kit/foldkit-stylex-theme

@foldkit/ui's components, styled with `@kutur-kit/foldkit-stylex`. Each component's module re-exports it with its view styled, adds `restyle` to layer your styles over the theme, and draws the marks inside your elements, such as chevrons and ticks. The look is built on tokens that an app overrides app-wide, per part or at runtime. Colors follow `color-scheme`; under reduced motion, parts still fade but no longer move. Controls are 32px tall with a 24px pointer target under a mouse, and 44px for both under a finger.

Tested with the lowest versions in `peerDependencies`.

```sh
pnpm add @kutur-kit/foldkit-stylex@alpha @kutur-kit/foldkit-stylex-theme@alpha '@stylexjs/stylex@~0.19.1'
pnpm add -D '@stylexjs/unplugin@~0.19.1' 'unplugin@^2.3.11'
```

## Setup

Set up `@kutur-kit/foldkit-stylex` as its README describes: `foldkitStylex()` in `vite.config.ts` and `vitest.config.ts`, and a stylesheet imported by the client entry. `foldkitStylex()` compiles this package too. Its other peers, `@foldkit/ui`, `foldkit` and `effect`, are already in a Foldkit app. Put `color-scheme` in that stylesheet, so the colors follow the system's light or dark mode:

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}
```

## Use a component

Each component has its own module, which exports a namespace named after the component: @foldkit/ui's module, with the member that makes the view styled by the theme. Import it in place of @foldkit/ui's, and render the namespace's helpers inside your elements:

<!-- demo: apps/foldkit-stylex-gallery/src/demos/checkbox.ts -->

```ts
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import { Checkbox } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { space } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

export const summary = "Turns one option on or off.";

export const Model = Schema.Struct({ isChecked: Schema.Boolean });

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({ ToggledTerms: { isChecked: Schema.Boolean } });

export type Message = typeof Message.Type;

export const init = (): Update.Return<Model, Message> => ({ model: { isChecked: false } });

export const update = (_model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledTerms: ({ isChecked }) => ({ model: { isChecked } }),
  });

const styles = stylex.create({
  // The box centres itself on the label's first line, so the row aligns to the start.
  row: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignItems: "start",
    columnGap: space.sm,
  },
  text: { display: "grid", gap: "0.125rem" },
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Checkbox.view(
    {
      id: "terms",
      isChecked: model.isChecked,
      hasDescription: true,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label, description }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button([...checkbox], [Checkbox.mark({ isChecked: model.isChecked })]),
            h.div(
              [sx(styles.text)],
              [
                h.label([...label], ["I accept the terms"]),
                h.p([...description], ["You can read them again in your settings."]),
              ],
            ),
          ],
        ),
    },
    h,
  );
```

| Component   | Module                                          | Namespace     | Helpers                                                                                                                                                    |
| ----------- | ----------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Animation   | `@kutur-kit/foldkit-stylex-theme/animation`     | `Animation`   |                                                                                                                                                            |
| Button      | `@kutur-kit/foldkit-stylex-theme/button`        | `Button`      | `primary` and `quiet`, layers for `restyle`                                                                                                                |
| Calendar    | `@kutur-kit/foldkit-stylex-theme/calendar`      | `Calendar`    | `header`, with `header.bar` around the navigation and `header.title`; `previousIcon`, `nextIcon`                                                           |
| Checkbox    | `@kutur-kit/foldkit-stylex-theme/checkbox`      | `Checkbox`    | `mark` in the checkbox: a tick, or a dash while indeterminate                                                                                              |
| Combobox    | `@kutur-kit/foldkit-stylex-theme/combobox`      | `Combobox`    | `buttonContent`, the chevron; `itemContent`, an item's label and tick                                                                                      |
| DatePicker  | `@kutur-kit/foldkit-stylex-theme/date-picker`   | `DatePicker`  | `triggerContent`, the date or a placeholder before a calendar icon                                                                                         |
| Dialog      | `@kutur-kit/foldkit-stylex-theme/dialog`        | `Dialog`      | `closeIcon` in the close button                                                                                                                            |
| Disclosure  | `@kutur-kit/foldkit-stylex-theme/disclosure`    | `Disclosure`  | `buttonContent`, the label before a chevron                                                                                                                |
| DragAndDrop | `@kutur-kit/foldkit-stylex-theme/drag-and-drop` | `DragAndDrop` | `list`, with `list.body` for each droppable, `list.target`, `list.placeholder` and `list.ghost`                                                            |
| Fieldset    | `@kutur-kit/foldkit-stylex-theme/fieldset`      | `Fieldset`    |                                                                                                                                                            |
| FileDrop    | `@kutur-kit/foldkit-stylex-theme/file-drop`     | `FileDrop`    | `text`, with `text.title` and `text.hint` inside the zone                                                                                                  |
| HoverIntent | `@kutur-kit/foldkit-stylex-theme/hover-intent`  | `HoverIntent` |                                                                                                                                                            |
| Input       | `@kutur-kit/foldkit-stylex-theme/input`         | `Input`       |                                                                                                                                                            |
| Listbox     | `@kutur-kit/foldkit-stylex-theme/listbox`       | `Listbox`     | `buttonContent`, the label before a chevron; `placeholder`, a muted `buttonContent` label while nothing is chosen; `itemContent`, an item's label and tick |
| Menu        | `@kutur-kit/foldkit-stylex-theme/menu`          | `Menu`        | `buttonContent`, the label before a chevron                                                                                                                |
| Meter       | `@kutur-kit/foldkit-stylex-theme/meter`         | `Meter`       |                                                                                                                                                            |
| Nav         | `@kutur-kit/foldkit-stylex-theme/nav`           | `Nav`         |                                                                                                                                                            |
| Popover     | `@kutur-kit/foldkit-stylex-theme/popover`       | `Popover`     |                                                                                                                                                            |
| Progress    | `@kutur-kit/foldkit-stylex-theme/progress`      | `Progress`    |                                                                                                                                                            |
| RadioGroup  | `@kutur-kit/foldkit-stylex-theme/radio-group`   | `RadioGroup`  | `mark` first in each option                                                                                                                                |
| Select      | `@kutur-kit/foldkit-stylex-theme/select`        | `Select`      | `field` around the `<select>`, with the chevron the theme draws for the browser's arrow                                                                    |
| Slider      | `@kutur-kit/foldkit-stylex-theme/slider`        | `Slider`      |                                                                                                                                                            |
| Switch      | `@kutur-kit/foldkit-stylex-theme/switch`        | `Switch`      |                                                                                                                                                            |
| Tabs        | `@kutur-kit/foldkit-stylex-theme/tabs`          | `Tabs`        |                                                                                                                                                            |
| Textarea    | `@kutur-kit/foldkit-stylex-theme/textarea`      | `Textarea`    |                                                                                                                                                            |
| Toast       | `@kutur-kit/foldkit-stylex-theme/toast`         | `Toast`       | `closeIcon` in the dismiss button; `content`, with `content.body` and `content.error` for each entry                                                       |
| Tooltip     | `@kutur-kit/foldkit-stylex-theme/tooltip`       | `Tooltip`     |                                                                                                                                                            |
| VirtualList | `@kutur-kit/foldkit-stylex-theme/virtual-list`  | `VirtualList` | `row`, with `row.body` for each item and `row.detail` inside it                                                                                            |

The helpers take what they draw from a value you already hold, such as `Listbox.buttonContent(label, model.languages)` or `Listbox.itemContent(language, state)`. They carry no text: copy and aria-labels stay yours, such as the close button's `h.AriaLabel("Close")`.

Some components need something from your model or view:

- Combobox, DatePicker, Dialog, Listbox, Menu and Popover: init the component with `isAnimated: true`. Without it, @foldkit/ui shows and removes the panel at once, so the fade never plays.
- Button: @foldkit/ui marks a disabled button with `aria-disabled` and drops its `onClick`, so a disabled `type: "submit"` button still submits its form. Check the condition where you handle the submit.
- Fieldset: a disabled fieldset dims its legend and description only. Pass `isDisabled` to each control inside too, so the control's own look dims it.
- HoverIntent: keep the panel rendered while it is hidden, so the theme can fade it out, and position it with a layer of your own, such as `HoverIntent.restyle({ panel: styles.placed })`. HoverIntent positions nothing.
- Listbox and Combobox: `Listbox.Multi` and `Combobox.Multi` have their own `create` and `restyle`, and take the same helpers.
- Nav: render each link as a direct child of the `<nav>`, which lays the links out in a row.
- Progress: render `track` inside `progress` and `indicator` inside `track`.
- Slider: with `thumbAlignment: "Edge"`, pass `thumbSize: size.mark`, so the thumb's travel matches the themed thumb.
- Switch: render the button empty. The theme draws the thumb.
- Tooltip: render the panel only while `isVisible`, as @foldkit/ui expects. The theme shows and hides it at once.

## Tokens

`@kutur-kit/foldkit-stylex-theme/tokens.stylex` exports the token groups, `ThemeOverrides` and `ThemePreset`. Each token reads its `--fks-*` custom property and falls back to the default. The greys mix `color.text` into `color.surface` in OKLab, so a preset that sets those two gets matching greys.

| Token               | Custom property            | Default                                                                                                                                                                                                                                                                                                     | Used for                                                                                                                                                                              |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color.surface`     | `--fks-color-surface`      | `light-dark(#ffffff, #111113)`                                                                                                                                                                                                                                                                              | Backgrounds of controls and panels, and the switch's thumb while off                                                                                                                  |
| `color.text`        | `--fks-color-text`         | `light-dark(#18181b, #ededed)`                                                                                                                                                                                                                                                                              | Text                                                                                                                                                                                  |
| `color.subtle`      | `--fks-color-subtle`       | `color-mix(in oklab, var(--fks-color-text) 5%, var(--fks-color-surface))`                                                                                                                                                                                                                                   | The resting fill of fields, buttons and triggers; hovered quiet buttons, links, calendar days and file drops, the active item, the current link, today's date and drag-and-drop lists |
| `color.border`      | `--fks-color-border`       | `color-mix(in oklab, var(--fks-color-text) 10%, var(--fks-color-surface))`                                                                                                                                                                                                                                  | Hairlines: separators, the resting edges of fields, buttons, triggers and draggable items, the arrow's edge, and the empty part of slider, meter and progress tracks                  |
| `color.control`     | `--fks-color-control`      | `color-mix(in oklab, var(--fks-color-text) 50%, var(--fks-color-surface))`                                                                                                                                                                                                                                  | The edges of checkboxes, radios and switches, and of a hovered field, button or trigger; the switch's track while off, and drop targets                                               |
| `color.muted`       | `--fks-color-muted`        | `color-mix(in oklab, var(--fks-color-text) 62%, var(--fks-color-surface))`                                                                                                                                                                                                                                  | Descriptions, placeholders, group headings, chevrons, quiet buttons, and inactive tabs and links                                                                                      |
| `color.accent`      | `--fks-color-accent`       | `var(--fks-color-text)`                                                                                                                                                                                                                                                                                     | Focus rings, checked and selected controls, primary buttons, the active tab's line, and the fill of sliders, meters and progress bars                                                 |
| `color.onAccent`    | `--fks-color-on-accent`    | `var(--fks-color-surface)`                                                                                                                                                                                                                                                                                  | Marks and text on the accent: the tick, the switch's thumb once on, the selected date and a primary button's label                                                                    |
| `color.danger`      | `--fks-color-danger`       | `light-dark(#b91c1c, #f87171)`                                                                                                                                                                                                                                                                              | Invalid fields, error toasts and a meter at its worst                                                                                                                                 |
| `color.overlay`     | `--fks-color-overlay`      | `light-dark(rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.6))`                                                                                                                                                                                                                                                            | The backdrop behind a dialog                                                                                                                                                          |
| `space.xs`          | `--fks-space-xs`           | `0.25rem`                                                                                                                                                                                                                                                                                                   | Padding of lists and panels                                                                                                                                                           |
| `space.sm`          | `--fks-space-sm`           | `0.5rem`                                                                                                                                                                                                                                                                                                    | Gaps between a control and its label; padding of list items                                                                                                                           |
| `space.md`          | `--fks-space-md`           | `0.75rem`                                                                                                                                                                                                                                                                                                   | Padding of buttons, fields and popovers                                                                                                                                               |
| `space.lg`          | `--fks-space-lg`           | `1rem`                                                                                                                                                                                                                                                                                                      | Padding of dialogs                                                                                                                                                                    |
| `space.xl`          | `--fks-space-xl`           | `1.5rem`                                                                                                                                                                                                                                                                                                    | Gaps between groups, such as the fieldsets of a form                                                                                                                                  |
| `size.control`      | `--fks-size-control`       | `2rem`                                                                                                                                                                                                                                                                                                      | The height of buttons, fields, triggers, tabs, list items and calendar days: at least 2.75rem under a coarse pointer                                                                  |
| `size.target`       | `--fks-size-target`        | `1.5rem`                                                                                                                                                                                                                                                                                                    | The smallest pointer target of every control: at least 2.75rem under a coarse pointer                                                                                                 |
| `size.mark`         | `--fks-size-mark`          | `1rem`                                                                                                                                                                                                                                                                                                      | Checkboxes, radios, the slider's thumb and the switch, which is two marks wide                                                                                                        |
| `radius.control`    | `--fks-radius-control`     | `0.375rem`                                                                                                                                                                                                                                                                                                  | Controls and list items                                                                                                                                                               |
| `radius.panel`      | `--fks-radius-panel`       | `calc(var(--fks-radius-control, 0.375rem) + 0.25rem)`                                                                                                                                                                                                                                                       | Popovers, lists, dialogs and toasts: around items inset by `space.xs`, the two corners share a centre                                                                                 |
| `fontSize.xs`       | `--fks-font-size-xs`       | `0.75rem`                                                                                                                                                                                                                                                                                                   | Group headings, captions and the calendar's weekdays                                                                                                                                  |
| `fontSize.sm`       | `--fks-font-size-sm`       | `0.8125rem`                                                                                                                                                                                                                                                                                                 | Descriptions, labels and tooltips                                                                                                                                                     |
| `fontSize.md`       | `--fks-font-size-md`       | `0.875rem`                                                                                                                                                                                                                                                                                                  | Controls, list items, panels and toasts                                                                                                                                               |
| `fontSize.lg`       | `--fks-font-size-lg`       | `1rem`                                                                                                                                                                                                                                                                                                      | Dialog titles                                                                                                                                                                         |
| `lineHeight.xs`     | `--fks-line-height-xs`     | `1rem`                                                                                                                                                                                                                                                                                                      | Group headings, captions and the calendar's weekdays                                                                                                                                  |
| `lineHeight.sm`     | `--fks-line-height-sm`     | `1.125rem`                                                                                                                                                                                                                                                                                                  | Descriptions, labels and tooltips                                                                                                                                                     |
| `lineHeight.md`     | `--fks-line-height-md`     | `1.25rem`                                                                                                                                                                                                                                                                                                   | Controls, list items, panels and toasts; a field's block padding centres one such line                                                                                                |
| `lineHeight.lg`     | `--fks-line-height-lg`     | `1.5rem`                                                                                                                                                                                                                                                                                                    | Dialog titles, which the close button centres on                                                                                                                                      |
| `fontWeight.medium` | `--fks-font-weight-medium` | `500`                                                                                                                                                                                                                                                                                                       | Buttons, tabs, labels, triggers' values and titles                                                                                                                                    |
| `fontWeight.strong` | `--fks-font-weight-strong` | `600`                                                                                                                                                                                                                                                                                                       | Headings                                                                                                                                                                              |
| `motion.instant`    | `--fks-motion-instant`     | `100ms`                                                                                                                                                                                                                                                                                                     | Hover colors, the press of a button, and popovers, lists, dialogs and toasts as they leave                                                                                            |
| `motion.fast`       | `--fks-motion-fast`        | `150ms`                                                                                                                                                                                                                                                                                                     | Popovers and lists as they enter, a highlight fading out, chevrons, ticks and the switch's thumb                                                                                      |
| `motion.slow`       | `--fks-motion-slow`        | `200ms`                                                                                                                                                                                                                                                                                                     | Dialogs and toasts as they enter, meter and progress fills, and the indeterminate progress sweep at 10 times                                                                          |
| `motion.easing`     | `--fks-motion-easing`      | `cubic-bezier(0.23, 1, 0.32, 1)`                                                                                                                                                                                                                                                                            | Every transition but the progress value, which is linear                                                                                                                              |
| `shadow.panel`      | `--fks-shadow-panel`       | `inset 0 1px 0 light-dark(transparent, rgb(255 255 255 / 0.04)), 0 0 0 1px var(--fks-color-border, color-mix(in oklab, var(--fks-color-text) 10%, var(--fks-color-surface))), 0 4px 12px -2px light-dark(rgb(0 0 0 / 0.08), transparent), 0 12px 32px -8px light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.5))` | Popovers, lists, dialogs, toasts and dragged items: its ring, in `color.border`, is their edge, so they draw a border only under forced colors, which drop shadows                    |
| `shadow.control`    | `--fks-shadow-control`     | `0 1px 2px light-dark(rgb(0 0 0 / 0.05), transparent)`                                                                                                                                                                                                                                                      | Buttons, the thumbs of switches and sliders, and draggable items                                                                                                                      |

Use the tokens in your own styles to match the look: `stylex.create({ note: { color: color.muted } })`.

`color-mix()` and the defaults that read other tokens resolve where the tokens are defined, at `:root`. A part that sets `color.surface` or `color.text` for itself must set the greys, `color.subtle`, `color.border`, `color.control` and `color.muted`, plus `color.accent` and `color.onAccent`, or they keep the page's values. Set them as tokens on the part: a `--fks-*` property set below `<html>` reaches no token.

## Dark mode

The colors are `light-dark()` pairs, so they follow `color-scheme`, portaled panels included. The `:root` line in Setup follows the system. For a manual toggle, set `document.documentElement.style.colorScheme` to `"light"` or `"dark"` from a Command. Foldkit's `Document` cannot set attributes on `<html>`, so a stored choice shows the system's scheme until that Command runs.

## Customise

| Want                           | Write                                                                                                        | Why it works                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend some parts              | `Popover.restyle({ panel: styles.wide }).view`                                                               | The theme is the first styles object, and later ones win property by property. A shorthand that StyleX would apply under the theme's longhand fails to compile and names the longhand to set, except inside `::before` and other pseudo-elements (see Limitations).                                                                                              |
| Drop a property the theme sets | `Popover.restyle({ panel: styles.unpadded }).view`, with `unpadded: { padding: null }`                       | `null` removes the earlier value.                                                                                                                                                                                                                                                                                                                                |
| Change tokens app-wide         | A `.stylex.ts` file with `--fks-*` keys, imported once by the client entry                                   | Keys starting with `--` keep their names, at `:root`, which portaled panels inherit.                                                                                                                                                                                                                                                                             |
| Change tokens for one part     | `stylex.create({ inverted: { [color.surface]: "…", [color.text]: "…", … } })`, in that part's layer          | Sets those tokens on the part, portaled or not; the others keep their values. Set the greys, `color.accent` and `color.onAccent` too (see Tokens). A size there replaces its coarse-pointer value too, so give it one: `{ [size.control]: { default: "2.5rem", "@media (pointer: coarse)": "2.75rem" } }`; the `touch` variation catches a size that forgets it. |
| Switch tokens at runtime       | `--fks-*` on `<html>`, from a Command                                                                        | Every token reads them at `:root`.                                                                                                                                                                                                                                                                                                                               |
| Your own look                  | `CheckboxStyle.view` from `@kutur-kit/foldkit-stylex`, with objects written `satisfies CheckboxStyle.Styles` | The core needs nothing from this package; the styles may use these tokens or none.                                                                                                                                                                                                                                                                               |

`restyle` returns an object with the namespace's themed member: `create` for the components built with `create()` (Combobox, Listbox, Menu, RadioGroup and Tabs, and the Multi variants), `make` for Toast, `draggable` for DragAndDrop and `view` for the rest. Call it once, at module scope, as `const wideView = Popover.restyle({ panel: styles.wide }).view`, since each call builds a new view, and use that member in place of the namespace's.

App-wide values go in a file such as `src/brand.stylex.ts`. `satisfies ThemeOverrides` makes a misspelt name fail to compile:

```ts
import type { ThemeOverrides } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

export const brand = stylex.defineVars({
  "--fks-color-accent": "light-dark(#c2410c, #fb923c)",
  "--fks-radius-control": "0",
  "--fks-space-md": { default: "1rem", "@media (min-width: 48rem)": "1.25rem" },
} satisfies ThemeOverrides);
```

Write `--fks-*` colors as `light-dark()` pairs to keep dark mode. A value may vary by condition, as `--fks-space-md` does here.

## Switch tokens at runtime

A theme picker sets presets of `--fks-*` values on `<html>`. Foldkit's `Document` cannot, so a Command does it. Type each preset as `ThemePreset`, which takes plain strings, as `style.setProperty` does, and clear the previous one first, so tokens the new preset leaves out return to their defaults:

<!-- demo: apps/foldkit-stylex-gallery/src/presets.ts -->

```ts
import type { ThemePreset } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Preset = Schema.Literals(["Kit", "Ember", "Paper"]);

export type Preset = typeof Preset.Type;

// Kit keeps the theme's defaults. Colors are light-dark() pairs, so dark mode keeps working. Ember
// adds a hue; Paper changes surface and text, and the greys mixed from them follow. The panel radius
// is the control radius plus 0.25rem unless a preset sets it, as Paper does for square corners.
const presets = {
  Kit: {},
  Ember: {
    "--fks-color-accent": "light-dark(#b45600, #fb923c)",
    "--fks-radius-control": "2px",
  },
  Paper: {
    "--fks-color-surface": "light-dark(#fffbeb, #1c1917)",
    "--fks-color-text": "light-dark(#1c1917, #fafaf9)",
    "--fks-color-accent": "light-dark(#15803d, #6fc884)",
    "--fks-radius-control": "0px",
    "--fks-radius-panel": "0px",
  },
} satisfies Record<Preset, ThemePreset>;

export const Message = defineMessageUnion({ CompletedApplyPreset: {} });

export type Message = typeof Message.Type;

export const ApplyPreset = Command.define("ApplyPreset", {
  args: { preset: Preset },
  messages: [Message.CompletedApplyPreset],
  execute: ({ preset }) =>
    Effect.sync(() => {
      const { style } = document.documentElement;

      for (const name of Array.from(style)) {
        if (name.startsWith("--fks-")) {
          style.removeProperty(name);
        }
      }

      for (const [name, value] of Object.entries(presets[preset])) {
        style.setProperty(name, value);
      }

      return Message.CompletedApplyPreset();
    }),
});
```

A preset may change the colors, the radius (`--fks-radius-control`, which `--fks-radius-panel` follows unless the preset sets it) or the density (the `--fks-space-*` values, `--fks-size-control` and `--fks-size-target`, which never go below 44px under a coarse pointer). Presets that set different tokens combine with object spread. Values set on `<html>` win over those in `src/brand.stylex.ts`.

## Contrast

In both schemes, the defaults give text, `color.muted` and `color.danger` at least 4.5:1 on `color.surface` and `color.subtle`, and `color.onAccent` 4.5:1 on `color.accent`. The edges of controls (`color.control`) and `color.accent`, which draws the focus ring, reach 3:1 on both. `color.border` stays far below 3:1: it draws separators, and the resting edge of fields, triggers and buttons, which the `color.subtle` fill marks until a hover turns the edge to `color.control` and focus adds the ring. Do not use it for a control's only edge.

When you override a color, check the pairs with `tokenContrast` from `@kutur-kit/foldkit-stylex-theme/testing`, in a browser test of a page that loads a themed component. It finds the tokens in the page's stylesheets, measures each pair in light and dark as the browser computes it, and returns one finding per pair below its minimum, naming the colors measured and the custom property to change. A translucent color is measured over what it lies on: the surface over the page's `Canvas`, the other backgrounds over the surface. A value that is no color gets one finding in place of its pairs:

```ts
import { tokenContrast } from "@kutur-kit/foldkit-stylex-theme/testing";

// Vitest browser mode
expect(tokenContrast()).toEqual([]);
expect(tokenContrast({ preset: paper })).toEqual([]);
expect(tokenContrast({ part: "#inverted-panel" })).toEqual([]);

// Playwright
expect(await page.evaluate(tokenContrast, { preset: paper })).toEqual([]);
```

`preset` takes a `ThemePreset` and sets it on `<html>` for the call, in place of the `--fks-*` values there. `part` measures under the element it selects and adds a `derived` finding when that part sets `color.surface` or `color.text` but keeps the page's greys, `color.accent` or `color.onAccent`. Its advice names the token on the part, such as `color.accent on #inverted-panel`. `tokenContrast` throws when no stylesheet from the page's origin defines the tokens, or when `part` matches nothing.

The core's `audit` asks every field for a 3:1 edge at rest. Pass it this package's `hairline`, the selector of the text fields the theme rests on a hairline, so it asks them for their fill instead. A read-only field is a well, marked by its fill alone: `color.text` on a mix of 8% `color.text` into `color.surface`, which no token names. It takes no input, so it gets no hover edge. `tokenContrast` checks the 3:1 of `color.control` that a hover gives the others:

```ts
import { hairline } from "@kutur-kit/foldkit-stylex-theme/testing";
import { audit } from "@kutur-kit/foldkit-stylex/testing";

expect(await page.evaluate(audit, { hairline })).toEqual([]);
```

## Forced colors

Under forced colors, such as Windows High Contrast, the browser swaps each color that is not a system color for one of the user's, which would turn the theme's fills into the background. So there `color.accent` is `Highlight`, `color.onAccent` is `HighlightText`, `color.control` and `color.danger` are `CanvasText`, whatever `--fks-*` says. Separators and the empty part of a track take `GrayText`, and edges keep the browser's own colors. Panels, whose edge is `shadow.panel`'s ring, draw a border instead, since forced colors drop shadows. A list's active item and the current link take `Highlight` and `HighlightText`. Checked, selected and filled parts keep showing their state, and the marks, drawn in `currentColor`, follow. The browser picks the other colors per element, such as `LinkText` for a link.

A token you set on one part replaces its system color too, so give that value one of its own: `{ [color.accent]: { default: "…", "@media (forced-colors: active)": "Highlight" } }`.

A part of your own that puts `color.onAccent` on `color.accent` needs `forcedColorAdjust: "none"`, as the theme's parts do, or the browser replaces its fill and its label can vanish against the new one; every color inside it must then be a system color under forced colors, since the browser no longer swaps them.

## Errors you may see

| Mistake                                                                 | Last line                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"--fks-color-acent"` in a `defineVars` that satisfies `ThemeOverrides` | `'"--fks-color-acent"' does not exist in type 'ThemeOverrides'.`                                                                                                                                                                       |
| `color.acent` as a key                                                  | `Did you mean 'accent'?`                                                                                                                                                                                                               |
| `Listbox.restyle({ button: styles.flat })`, with `flat: { padding: 0 }` | `"An earlier styles object sets paddingBlock, paddingInline and paddingInlineEnd on this part, which StyleX applies over padding whatever the order. Set paddingBlock, paddingInline and paddingInlineEnd in this styles object too."` |

The theme counts as the first styles object of `restyle`. Other mistakes in a layer, such as a part the component does not have or a property the part cannot set, fail with the core's messages, listed in its README.

## Limitations

- The checkbox, the switch, the slider's thumb, the calendar's buttons and the dialog's and toast's close buttons draw their `size.target` pointer target with `::before`. A `::before` of yours on those parts merges into it property by property, keeping the target's size and position, so draw decorations with `::after`. The switch draws its thumb with `::after`.
