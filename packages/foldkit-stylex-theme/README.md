# @kutur-kit/foldkit-stylex-theme

An optional look for `@kutur-kit/foldkit-stylex`: styles for each @foldkit/ui component, built on tokens that an app overrides app-wide, per part or at runtime. Colors follow `color-scheme`; motion stops for users who ask for reduced motion; controls keep a 44px pointer target.

Tested with the lowest versions in `peerDependencies`.

```sh
pnpm add @kutur-kit/foldkit-stylex@alpha @kutur-kit/foldkit-stylex-theme@alpha '@stylexjs/stylex@~0.19.1'
pnpm add -D '@stylexjs/unplugin@~0.19.1' 'unplugin@^2.3.11'
```

## Setup

Set up `@kutur-kit/foldkit-stylex` as its README describes: `foldkitStylex()` in `vite.config.ts` and `vitest.config.ts`, and a stylesheet imported by the client entry. `foldkitStylex()` compiles this package too. Put `color-scheme` in that stylesheet, so the colors follow the system's light or dark mode:

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}
```

## Use a look

Each component has its own module. Pass its look to the component's `XStyle.view`, and style the children you render with the named styles next to it:

<!-- demo: src/themed/checkbox.ts -->

```ts
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import { checkboxIndicator, checkboxTheme } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import * as stylex from "@stylexjs/stylex";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

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
  row: { display: "flex", alignItems: "center", gap: 12 },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, checkboxTheme);

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  checkboxView(
    {
      id: "themed-terms",
      isChecked: model.isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button(
              [...checkbox],
              [
                h.span(
                  [sx(checkboxIndicator.tick, model.isChecked && checkboxIndicator.ticked)],
                  ["✓"],
                ),
              ],
            ),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );
```

| Component   | Module                                          | Look               | Styles for children you render                                                                                                                         |
| ----------- | ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Animation   | `@kutur-kit/foldkit-stylex-theme/animation`     | `animationTheme`   |                                                                                                                                                        |
| Button      | `@kutur-kit/foldkit-stylex-theme/button`        | `buttonTheme`      |                                                                                                                                                        |
| Calendar    | `@kutur-kit/foldkit-stylex-theme/calendar`      | `calendarTheme`    | `calendarHeader`: `bar` around the navigation buttons and heading; `title` for the year grid's heading                                                 |
| Checkbox    | `@kutur-kit/foldkit-stylex-theme/checkbox`      | `checkboxTheme`    | `checkboxIndicator`: `tick`, `ticked` for the mark                                                                                                     |
| Combobox    | `@kutur-kit/foldkit-stylex-theme/combobox`      | `comboboxTheme`    | `comboboxIndicator`: `chevron`, `open` in the button; `tick`, `ticked` in an item                                                                      |
| DatePicker  | `@kutur-kit/foldkit-stylex-theme/date-picker`   | `datePickerTheme`  | `datePickerTrigger`: `content`, `placeholder`, `icon` in the trigger; `calendarHeader` from `@kutur-kit/foldkit-stylex-theme/calendar` in the calendar |
| Dialog      | `@kutur-kit/foldkit-stylex-theme/dialog`        | `dialogTheme`      |                                                                                                                                                        |
| Disclosure  | `@kutur-kit/foldkit-stylex-theme/disclosure`    | `disclosureTheme`  | `disclosureChevron`: `chevron`, `open` in the button                                                                                                   |
| DragAndDrop | `@kutur-kit/foldkit-stylex-theme/drag-and-drop` | `dragAndDropTheme` | `dragAndDropList`: `list`, `target` for each droppable; `placeholder` for the drop gap; `ghost` for the pointer ghost                                  |
| Fieldset    | `@kutur-kit/foldkit-stylex-theme/fieldset`      | `fieldsetTheme`    |                                                                                                                                                        |
| FileDrop    | `@kutur-kit/foldkit-stylex-theme/file-drop`     | `fileDropTheme`    | `fileDropText`: `title`, `hint` inside the zone                                                                                                        |
| HoverIntent | `@kutur-kit/foldkit-stylex-theme/hover-intent`  | `hoverIntentTheme` |                                                                                                                                                        |
| Input       | `@kutur-kit/foldkit-stylex-theme/input`         | `inputTheme`       |                                                                                                                                                        |
| Listbox     | `@kutur-kit/foldkit-stylex-theme/listbox`       | `listboxTheme`     | `listboxButton`: `content` in the button; `listboxIndicator`: `chevron`, `open` in the button; `tick`, `ticked` in an item                             |
| Menu        | `@kutur-kit/foldkit-stylex-theme/menu`          | `menuTheme`        | `menuButton`: `content` in the button; `menuIndicator`: `chevron`, `open` in the button                                                                |
| Meter       | `@kutur-kit/foldkit-stylex-theme/meter`         | `meterTheme`       |                                                                                                                                                        |
| Nav         | `@kutur-kit/foldkit-stylex-theme/nav`           | `navTheme`         |                                                                                                                                                        |
| Popover     | `@kutur-kit/foldkit-stylex-theme/popover`       | `popoverTheme`     |                                                                                                                                                        |
| Progress    | `@kutur-kit/foldkit-stylex-theme/progress`      | `progressTheme`    |                                                                                                                                                        |
| RadioGroup  | `@kutur-kit/foldkit-stylex-theme/radio-group`   | `radioGroupTheme`  | `radioGroupMark`: `mark`, `marked` first in each option                                                                                                |
| Select      | `@kutur-kit/foldkit-stylex-theme/select`        | `selectTheme`      | `selectChevron`: `field` around the select and arrow; `chevron`, `disabled` for the arrow                                                              |
| Slider      | `@kutur-kit/foldkit-stylex-theme/slider`        | `sliderTheme`      |                                                                                                                                                        |
| Switch      | `@kutur-kit/foldkit-stylex-theme/switch`        | `switchTheme`      | `switchThumb`: `thumb`, `on` in the button                                                                                                             |
| Tabs        | `@kutur-kit/foldkit-stylex-theme/tabs`          | `tabsTheme`        |                                                                                                                                                        |
| Textarea    | `@kutur-kit/foldkit-stylex-theme/textarea`      | `textareaTheme`    |                                                                                                                                                        |
| Toast       | `@kutur-kit/foldkit-stylex-theme/toast`         | `toastTheme`       | `toastContent`: `body`, `error` for your element inside each entry                                                                                     |
| Tooltip     | `@kutur-kit/foldkit-stylex-theme/tooltip`       | `tooltipTheme`     |                                                                                                                                                        |
| VirtualList | `@kutur-kit/foldkit-stylex-theme/virtual-list`  | `virtualListTheme` | `virtualListRow`: `row` for each item's element, `detail` inside it                                                                                    |

Some looks need something from your model or view:

- Combobox, DatePicker, Dialog, Listbox, Menu and Popover: init the component with `isAnimated: true`. Without it, @foldkit/ui shows and removes the panel at once, so the fade never plays.
- Button: @foldkit/ui marks a disabled button with `aria-disabled` and drops its `onClick`, so a disabled `type: "submit"` button still submits its form. Check the condition where you handle the submit.
- Fieldset: a disabled fieldset dims its legend and description only. Pass `isDisabled` to each control inside too, so the control's own look dims it.
- HoverIntent: keep the panel rendered while it is hidden, so the look can fade it out, and position it with a layer of your own, such as `{ panel: styles.placed }`. HoverIntent positions nothing.
- Listbox and Menu: `buttonContent` returns one element. Put `sx(listboxButton.content)` or `sx(menuButton.content)` on it, so the chevron sits at the button's end, and `h.AriaHidden(true)` on the chevron and on each item's tick. `listboxTheme` styles `ListboxStyle.view` and `ListboxStyle.Multi.view` alike.
- Nav: render each link as a direct child of the `<nav>`, which lays the links out in a row.
- Progress: render `track` inside `progress` and `indicator` inside `track`.
- Slider: with `thumbAlignment: "Edge"`, pass `thumbSize: size.thumb`, so the thumb's travel matches the themed thumb.
- Tooltip: render the panel only while `isVisible`, as @foldkit/ui expects. The look shows and hides it at once.

## Tokens

`@kutur-kit/foldkit-stylex-theme/tokens.stylex` exports the token groups, `ThemeOverrides` and `ThemePreset`. Each token reads its `--fks-*` custom property and falls back to the default.

| Token            | Custom property         | Default                                                           | Used for                                                                                                                                                                |
| ---------------- | ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color.surface`  | `--fks-color-surface`   | `light-dark(#ffffff, #18181b)`                                    | Backgrounds of controls and panels                                                                                                                                      |
| `color.text`     | `--fks-color-text`      | `light-dark(#18181b, #fafafa)`                                    | Text                                                                                                                                                                    |
| `color.muted`    | `--fks-color-muted`     | `light-dark(#52525b, #a1a1aa)`                                    | Descriptions, placeholders, group headings, chevrons, and inactive tabs and links                                                                                       |
| `color.border`   | `--fks-color-border`    | `light-dark(#d4d4d8, #3f3f46)`                                    | Separators, the edges of panels, buttons, fieldsets and draggable items, and the empty part of slider, meter and progress tracks                                        |
| `color.control`  | `--fks-color-control`   | `light-dark(#71717a, #a1a1aa)`                                    | The edges of checkboxes, radios, switches, fields and the Listbox and DatePicker buttons; the switch's thumb                                                            |
| `color.hover`    | `--fks-color-hover`     | `light-dark(#f4f4f5, #27272a)`                                    | Hovered buttons and links, open triggers, the highlighted item, read-only fields, drag-and-drop lists and FileDrop's drag-over                                          |
| `color.accent`   | `--fks-color-accent`    | `light-dark(#2563eb, #60a5fa)`                                    | Checked and selected controls, today's date, the active tab's line, the current link, drop targets and dragged items, and the fill of sliders, meters and progress bars |
| `color.onAccent` | `--fks-color-on-accent` | `light-dark(#ffffff, #0b1220)`                                    | Marks on the accent: the tick, the switch's thumb once on and the selected date                                                                                         |
| `color.danger`   | `--fks-color-danger`    | `light-dark(#b91c1c, #f87171)`                                    | Invalid fields, error toasts and a meter at its worst                                                                                                                   |
| `color.focus`    | `--fks-color-focus`     | `light-dark(#2563eb, #93c5fd)`                                    | Focus rings                                                                                                                                                             |
| `color.overlay`  | `--fks-color-overlay`   | `light-dark(rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.6))`                  | The backdrop behind a dialog                                                                                                                                            |
| `space.xs`       | `--fks-space-xs`        | `0.25rem`                                                         | Padding of lists                                                                                                                                                        |
| `space.sm`       | `--fks-space-sm`        | `0.5rem`                                                          | Gaps between a control and its label                                                                                                                                    |
| `space.md`       | `--fks-space-md`        | `1rem`                                                            | Padding of buttons, popovers and toasts                                                                                                                                 |
| `space.lg`       | `--fks-space-lg`        | `1.5rem`                                                          | Padding of dialogs                                                                                                                                                      |
| `size.target`    | `--fks-size-target`     | `2.75rem`                                                         | The smallest pointer target of every control                                                                                                                            |
| `size.box`       | `--fks-size-box`        | `1.25rem`                                                         | The checkbox and the radio's mark                                                                                                                                       |
| `size.thumb`     | `--fks-size-thumb`      | `1.25rem`                                                         | The thumbs of the slider and the switch, which is two thumbs wide                                                                                                       |
| `size.arrow`     | `--fks-size-arrow`      | `1rem`                                                            | The square box of the popover's arrow                                                                                                                                   |
| `radius.control` | `--fks-radius-control`  | `0.375rem`                                                        | Controls and list items                                                                                                                                                 |
| `radius.panel`   | `--fks-radius-panel`    | `0.625rem`                                                        | Popovers, lists, dialogs and toasts                                                                                                                                     |
| `fontSize.sm`    | `--fks-font-size-sm`    | `0.875rem`                                                        | Descriptions, labels and toasts                                                                                                                                         |
| `fontSize.md`    | `--fks-font-size-md`    | `1rem`                                                            | Controls                                                                                                                                                                |
| `fontSize.lg`    | `--fks-font-size-lg`    | `1.125rem`                                                        | Dialog titles                                                                                                                                                           |
| `motion.fast`    | `--fks-motion-fast`     | `150ms`                                                           | Popovers, lists and small changes; `0s` under reduced motion                                                                                                            |
| `motion.slow`    | `--fks-motion-slow`     | `250ms`                                                           | Dialogs, toasts, meter and progress fills, and the indeterminate progress sweep at 6 times; `0s` under reduced motion                                                   |
| `motion.easing`  | `--fks-motion-easing`   | `cubic-bezier(0.2, 0, 0, 1)`                                      | Opening and closing, chevrons, the switch's thumb, meter and progress fills, and FileDrop's drag-over                                                                   |
| `shadow.panel`   | `--fks-shadow-panel`    | `0 0.5rem 1.5rem light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.5))` | Popovers, lists, dialogs and toasts                                                                                                                                     |

Use the tokens in your own styles to match the look: `stylex.create({ note: { color: color.muted } })`.

## Dark mode

The colors are `light-dark()` pairs, so they follow `color-scheme`, portaled panels included. The `:root` line in Setup follows the system. For a manual toggle, set `document.documentElement.style.colorScheme` to `"light"` or `"dark"` from a Command. Foldkit's `Document` cannot set attributes on `<html>`, so a stored choice shows the system's scheme until that Command runs.

## Customise

| Want                       | Write                                                                                             | Why it works                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend some parts          | `PopoverStyle.view(Popover.view, popoverTheme, { panel: styles.wide })`                           | Later styles objects win property by property. A shorthand that StyleX would apply under the look's longhand fails to compile and names the longhand to set, except inside `::before` and other pseudo-elements (see Limitations). |
| Replace a part             | `PopoverStyle.view(Popover.view, { ...popoverTheme, panel: styles.panel })`                       | Object spread.                                                                                                                                                                                                                     |
| Change tokens app-wide     | A `.stylex.ts` file with `--fks-*` keys, imported once by the client entry                        | Keys starting with `--` keep their names, at `:root`, which portaled panels inherit.                                                                                                                                               |
| Change tokens for one part | `stylex.create({ inverted: { [color.surface]: "…", [color.text]: "…" } })`, in that part's styles | Sets those tokens on the part, portaled or not; the others keep their values.                                                                                                                                                      |
| Switch tokens at runtime   | `--fks-*` on `<html>`, from a Command                                                             | Every token reads them at `:root`.                                                                                                                                                                                                 |
| Your own look              | Objects written `satisfies CheckboxStyle.Styles` with your styles, on these tokens or none        | The core needs nothing from this package.                                                                                                                                                                                          |

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

<!-- demo: src/presets.ts -->

```ts
import type { ThemePreset } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";

export const Preset = Schema.Literals(["Kit", "Ember", "Paper"]);

export type Preset = typeof Preset.Type;

// Kit keeps the theme's defaults. Colors are light-dark() pairs, so dark mode keeps working.
const presets = {
  Kit: {},
  Ember: {
    "--fks-color-accent": "light-dark(#c2410c, #fb923c)",
    "--fks-radius-control": "2px",
    "--fks-radius-panel": "4px",
  },
  Paper: {
    "--fks-color-surface": "light-dark(#fffbeb, #1c1917)",
    "--fks-color-text": "light-dark(#1c1917, #fafaf9)",
    "--fks-color-accent": "light-dark(#15803d, #4ade80)",
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

A preset may change the colors, the radius (`--fks-radius-control` and `--fks-radius-panel`) or the density (the `--fks-space-*` values and `--fks-size-target`). Presets that set different tokens combine with object spread. Values set on `<html>` win over those in `src/brand.stylex.ts`.

## Contrast

In both schemes, the defaults give text, `color.muted` and `color.danger` at least 4.5:1 on `color.surface` and `color.hover`, and `color.onAccent` 4.5:1 on `color.accent`. The edges of controls (`color.control`), `color.accent` and the focus ring reach 3:1 on `color.surface`. `color.border` stays below 3:1, so use it for separators, not for a control's only edge. Check the pairs again when you override a color.

## Forced colors

Under forced colors, such as Windows High Contrast, the browser swaps each color that is not a system color for one of the user's, which would turn the theme's fills into the background. So there `color.accent` is `Highlight`, `color.onAccent` is `HighlightText`, `color.control` and `color.danger` are `CanvasText`, whatever `--fks-*` says. Separators and the empty part of a track take `GrayText`, and edges keep the browser's own colors. A list's highlighted item takes `Highlight` and `HighlightText`. Checked, selected and filled parts keep showing their state. The browser picks the other colors per element, such as `LinkText` for a link.

A token you set on one part replaces its system color too, so give that value one of its own: `{ [color.accent]: { default: "…", "@media (forced-colors: active)": "Highlight" } }`.

## Errors you may see

| Mistake                                                                 | Last line                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `"--fks-color-acent"` in a `defineVars` that satisfies `ThemeOverrides` | `'"--fks-color-acent"' does not exist in type 'ThemeOverrides'.` |
| `color.acent` as a key                                                  | `Did you mean 'accent'?`                                         |

A layer over a look that sets a property the part cannot set fails with the core's message, listed in its README.

## Limitations

- Under reduced motion, `motion.fast` and `motion.slow` are `0s` whatever `--fks-motion-*` says.
- The checkbox, the switch, the slider's thumb and track, and the calendar's navigation and cell buttons draw their 44px pointer target with `::before`. A `::before` of yours on those parts merges into it property by property, keeping the target's size and position, so draw decorations with `::after`.
