# @kutur-kit/foldkit-stylex

StyleX for @foldkit/ui components. Wrap a component's view once with typed styles for each of its parts, written as functions of the part's state, and the package adds the CSS each component needs to work: the backdrop that covers the page, the panel's z-index, the hidden closed dialog and the like. It ships no colors, spacing or fonts; `@kutur-kit/foldkit-stylex-theme` is an optional look.

Tested with the lowest versions in `peerDependencies`; a daily job tests the latest @foldkit/ui.

```sh
pnpm add @kutur-kit/foldkit-stylex@alpha @stylexjs/stylex
pnpm add -D @stylexjs/unplugin unplugin
```

`unplugin` is a peer of `@stylexjs/unplugin`; installs with strict peers fail without it.

## Setup

Put `foldkitStylex()` before `foldkit()` in `vite.config.ts`, in place of any other CSS or StyleX plugin. It takes StyleX's plugin options:

```ts
import { foldkit } from "@foldkit/vite-plugin";
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [foldkitStylex(), foldkit()],
});
```

With server rendering, keep Foldkit's options as they are: `foldkit({ ssr: { serverEntry: "/src/entry.server.ts", clientEntry: "/src/entry.ts", build: true } })`.

Vitest needs the same plugin. create-foldkit-app keeps `vitest.config.ts` separate, so add it there too:

```ts
import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [foldkitStylex()],
  test: { environment: "happy-dom" },
});
```

StyleX appends its rules, this package's included, to a stylesheet the page already links. Import one from the client entry (`import "./styles.css"`), or link it from `index.html` in a single-page app. Put page-wide settings there, not on your view's root, because anchored panels render outside it:

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}
```

| If you skip                                                      | What happens                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `foldkitStylex()` in `vitest.config.ts`                          | Every test file fails with a message that names the config.               |
| `foldkitStylex()` in `vite.config.ts`, using StyleX's own plugin | The browser console shows the same message and the page does not hydrate. |
| The stylesheet                                                   | `vite build` fails with a message that asks for one.                      |

## Never add a Class to a part's bundle

Foldkit keeps one `Class` per element, the last one. @foldkit/ui's docs append classes to the bundles `toView` receives; with this package that replaces the part's styles and the CSS it needs to work:

```ts
// Wrong: the button loses its styles.
toView: ({ button }) => h.button([...button, h.Class("ring")], ["Details"]);
```

Put the styles in that part's entry instead:

```ts
const popoverView = PopoverStyle.view(Popover.view, { button: styles.ring });
```

The [lint preset](#lint) reports the first form.

## Style a component

Wrap @foldkit/ui's view once, at module scope, and use the result where you used the view. Each key of the styles object is a part; its value is StyleX styles or a function of the part's state:

<!-- demo: src/demos/checkbox.ts -->

```ts
import type { Update } from "foldkit";
import type { Html, HtmlBuilder } from "foldkit/html";

import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
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
  row: { display: "flex", alignItems: "center", gap: 8 },
  box: {
    display: "grid",
    placeItems: "center",
    inlineSize: 24,
    blockSize: 24,
    padding: 0,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    backgroundColor: "transparent",
    color: "inherit",
  },
  checked: { backgroundColor: { default: "black", ":hover": "dimgray" }, color: "white" },
  disabled: { opacity: 0.5 },
  tick: { opacity: 0 },
  ticked: { opacity: 1 },
});

const checkboxView = CheckboxStyle.view(Checkbox.view, {
  checkbox: (state) => [
    styles.box,
    state.isChecked && styles.checked,
    state.isDisabled && styles.disabled,
  ],
});

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  checkboxView(
    {
      id: "terms",
      isChecked: model.isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [sx(styles.row)],
          [
            h.button(
              [...checkbox],
              [h.span([sx(styles.tick, model.isChecked && styles.ticked)], ["✓"])],
            ),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );
```

Submodel components such as Popover and Dialog take the wrapped view in `h.submodel({ view: popoverView, ... })`; `toView` gets bundles that already carry their styles. Components with class name inputs, such as Listbox, take their styles the same way, and their class name inputs and the `className` of `itemToConfig` no longer compile.

More styles objects after the first layer on top of it, property by property: `PopoverStyle.view(Popover.view, popoverTheme, { panel: styles.wide })`. [`@kutur-kit/foldkit-stylex-theme`](https://github.com/kutur-labs/kit/tree/main/packages/foldkit-stylex-theme#customise) lists the other ways to customise its looks.

## State

A part's state is typed: autocomplete lists every flag and a misspelt one does not compile. Flags are named after the @foldkit/ui field that sets the matching `data-*` attribute, and agree with it in every state:

- `isVisible` is true while a panel is open and while it plays its leave animation.
- `isClosed` is true where @foldkit/ui sets `data-closed`: the first frame of the enter animation and the leave animation. Put `transition*` on the base style and the closed values under `isClosed`; a fade on `!isVisible` never plays, because `isVisible` stays true while leaving.
- `isDisabled` means disabled whether @foldkit/ui uses the native `disabled` attribute or `aria-disabled`, so do not style `:disabled`.

Later entries win: in `[styles.box, state.isChecked && styles.checked, state.isDisabled && styles.disabled]` the disabled style wins over the checked one. Put pseudo-classes inside a variant: `checked: { backgroundColor: { default: "black", ":hover": "dimgray" } }`. Style focus with `":focus-visible"`.

Toast entries are the one exception: every entry shares one class, so style them with `":is([data-closed])"` and `":is([data-swipe])"`, and style variants on your own element inside `entryToView`.

## Portals

Anchored panels and backdrops render in Foldkit's portal root at the start of `<body>`, or inside the containing `<dialog>`. They inherit from `<body>`, not from your view's root: set `color`, and fonts unless they are on `:root`, on the portaled parts. Custom properties set on the `panel` part reach the panel; ones set on an ancestor of the trigger do not.

## Your own elements

`sx(...styles)` turns StyleX styles into the one `Class` an element keeps. Pass every style of the element to one call, conditions included, and put it last in the attribute list:

```ts
h.div([h.Id("row"), sx(styles.row, isActive && styles.active)], children);
```

`sx` and the parts take static styles only. For a runtime value, set a custom property with `h.Style({ "--progress": `${value}%` })` and read it with `var(--progress)` in a static style.

## What the package sets

| Component                                    | Before your styles                                                                                                     | After your styles, only in their state              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Popover, Listbox, Menu, Combobox, DatePicker | the wrapper around the trigger `position: relative`; the backdrop `position: fixed; inset: 0`; the panel `z-index: 10` |                                                     |
| Popover                                      | the arrow centred on the panel edge that faces the trigger and turned to point at it                                   |                                                     |
| Dialog                                       | `color: inherit` on the `<dialog>`; the backdrop covers the viewport; the panel `position: relative`                   | `display: none` on the `<dialog>` while not visible |
| FileDrop                                     | the input visually hidden, in place of @foldkit/ui's Tailwind `sr-only` class                                          |                                                     |
| Tabs                                         |                                                                                                                        | `display: none` on each inactive panel              |
| Tooltip                                      | the panel `z-index: 10`                                                                                                |                                                     |

Your value wins for the properties set before your styles. A part cannot set the properties @foldkit/ui writes inline, or those this package needs, such as the panel's `position` or the slider thumb's `transform`: the types reject them with a message that says where to style instead.

Draw Popover's arrow pointing up in a square box; the package centres it and turns it.

## Errors you may see

Each message is the last line of the error.

| Mistake                                                                | Last line                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ panel: s.absolute }` on Popover, or `[s.base, s.absolute]`          | `"@foldkit/ui sets position inline on this part. Floating UI positions the panel and caps its height; size and scroll an element inside it."`                                                                                   |
| `maxHeight` on Listbox `items`                                         | `"@foldkit/ui sets maxHeight inline on this part. Floating UI positions the panel and caps its height; size and scroll an element inside it."`                                                                                  |
| `zIndex` on Popover `button`                                           | `"@foldkit/ui sets zIndex inline on this part. It is set only while the panel is open, so a class value would apply only while it is closed."`                                                                                  |
| `transform` on Slider `thumb`                                          | `"@foldkit/ui sets transform inline on this part. Its position follows the value; use scale for press feedback."`                                                                                                               |
| `width` on Meter `fill` or Progress `indicator`                        | `"@foldkit/ui sets width inline on this part. Its width follows the value; style its height and color."`                                                                                                                        |
| `pointerEvents` on Tooltip `panel`                                     | `"@foldkit/ui sets pointerEvents inline on this part. A tooltip is not interactive; put interactive content in a Popover."`                                                                                                     |
| `padding` on VirtualList `container`                                   | `"@foldkit/ui sets padding inline on this part. The list scrolls and measures this element; style its size, border and background, and space rows inside itemToView."`                                                          |
| `userSelect` on a DragAndDrop `draggable`                              | `"@foldkit/ui sets userSelect inline on this part. Dragging by pointer and touch relies on it; style the element's look."`                                                                                                      |
| `translate` on Popover `arrow`, in any styles object                   | `"@kutur-kit/foldkit-stylex sets translate on this part so the component works. It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."`                                                  |
| A dynamic style on a part                                              | `"Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style."`                                                                                                                                  |
| A dynamic style in `sx`                                                | `"Pass static styles only. For a runtime value, set a custom property with h.Style({ '--x': value }) and read it with var(--x) in a static style."`                                                                             |
| `{ pannel: ... }`                                                      | `Did you mean to write 'panel'?`                                                                                                                                                                                                |
| `{ panel: ... }` on Listbox                                            | `"Listbox calls its panel items: put these styles under items."`                                                                                                                                                                |
| `{ panel: ... }` on Menu                                               | `"Menu calls its panel items: put these styles under items."`                                                                                                                                                                   |
| `{ panel: ... }` on Combobox                                           | `"Combobox calls its panel items: put these styles under items."`                                                                                                                                                               |
| `{ thumb: ... }` on Switch                                             | `"Switch renders no thumb part: draw it inside the button with sx(...)"`                                                                                                                                                        |
| `{ button: ... }` on DatePicker                                        | `"DatePicker calls its button trigger: put these styles under trigger."`                                                                                                                                                        |
| `{ cell: ... }` on DatePicker                                          | `"DatePicker styles its calendar under calendar: put these styles under calendar.cell."`                                                                                                                                        |
| `{ input: ... }` on FileDrop                                           | `"FileDrop's input is visually hidden: style root, with ':has(:focus-visible)' for keyboard focus."`                                                                                                                            |
| `{ row: ... }` on VirtualList                                          | `"VirtualList's rows take no class: style the element itemToView returns, which fills its row."`                                                                                                                                |
| `state.isHighlighted` on a Listbox item                                | `Property 'isHighlighted' does not exist on type 'ItemState'.`                                                                                                                                                                  |
| `PopoverStyle.view(Dialog.view)`                                       | `Property 'maybeFocusSelector' is missing`                                                                                                                                                                                      |
| `buttonClassName: "trigger"`                                           | `'"Style the button part through styles; this package sets buttonClassName."'`                                                                                                                                                  |
| `className` in `itemToConfig`                                          | `'"Style items through the item part of styles."'`                                                                                                                                                                              |
| `className` in `groupToHeading`                                        | `'"Style group headings through the heading part of styles."'`                                                                                                                                                                  |
| `h.Class(...)` in `buttonAttributes` or another `*Attributes` input    | `Type '{ readonly _tag: "Class"; readonly value: string; }' is missing the following properties from type`                                                                                                                      |
| `entry: (state) => ...` on Toast                                       | `Property 'variant' does not exist on type 'Readonly<{ "@foldkit/ui gives every entry one class, so entry takes no state. Style each variant on your own element inside entryToView, from entry.variant.": never; }>'.`         |
| An installed @foldkit/ui whose Popover lost a part this release styles | `"This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Popover changed RenderInfo.arrow. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."` |
| The same for a renamed or retyped state field, here Slider's           | `"This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Slider changed Model.dragState. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."`   |
| An installed @foldkit/ui whose Toast view requires a new input         | `Property 'motion' is missing in type`                                                                                                                                                                                          |

## Components

| Component   | Wrap                                                                                      | Parts                                                                                                                                                                        | State                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Animation   | `AnimationStyle.view(Animation.view, styles)`                                             | `element`                                                                                                                                                                    | `isShowing`, `isClosed`                                                                                                       |
| Button      | `ButtonStyle.view(Button.view, styles)`                                                   | `button`                                                                                                                                                                     | `isDisabled`                                                                                                                  |
| Calendar    | `CalendarStyle.view(Calendar.view, styles)`                                               | `root`, `previousMonthButton`, `nextMonthButton`, `previousPageButton`, `nextPageButton`, `headingButton`, `grid`, `headerRow`, `columnHeader`, `week`, `cell`, `cellButton` | `viewMode`; cells and their buttons: `isSelected`, `isFocused`, `isToday`, `isOutsideMonth`, `isDisabled`                     |
| Checkbox    | `CheckboxStyle.view(Checkbox.view, styles)`                                               | `checkbox`, `label`, `description`                                                                                                                                           | `isChecked`, `isIndeterminate`, `isDisabled`, `isReadOnly`                                                                    |
| Combobox    | `ComboboxStyle.view(Cities.view, styles)`, `ComboboxStyle.Multi.view(Tags.view, styles)`  | `wrapper`, `inputWrapper`, `input`, `button`, `backdrop`, `items`, `itemsScroll`, `item`, `group`, `heading`, `separator`                                                    | `isVisible`, `isClosed`, `isDisabled`, `isReadOnly`, `isInvalid`; items: `isActive`, `isSelected`, `isDisabled`, `isReadOnly` |
| DatePicker  | `DatePickerStyle.view(DatePicker.view, styles)`                                           | `wrapper`, `trigger`, `backdrop`, `panel`, `calendar`                                                                                                                        | `isVisible`, `isClosed`, `isDisabled`; `calendar` takes Calendar's styles                                                     |
| Dialog      | `DialogStyle.view(Dialog.view, styles)`                                                   | `dialog`, `backdrop`, `panel`, `title`, `description`, `closeButton`                                                                                                         | `isVisible`, `isClosed`                                                                                                       |
| Disclosure  | `DisclosureStyle.view(Disclosure.view, styles)`                                           | `button`, `panel`                                                                                                                                                            | `isOpen`, `isDisabled`                                                                                                        |
| DragAndDrop | `DragAndDropStyle.draggable(DragAndDrop.draggable, styles)`                               | `draggable`                                                                                                                                                                  | `isDragging`, `isDragged`                                                                                                     |
| Fieldset    | `FieldsetStyle.view(Fieldset.view, styles)`                                               | `fieldset`, `legend`, `description`                                                                                                                                          | `isDisabled`                                                                                                                  |
| FileDrop    | `FileDropStyle.view(FileDrop.view, styles)`                                               | `root`                                                                                                                                                                       | `isDragOver`, `isDisabled`                                                                                                    |
| HoverIntent | `HoverIntentStyle.view(HoverIntent.view, styles)`                                         | `trigger`, `panel`                                                                                                                                                           | `isVisible`                                                                                                                   |
| Input       | `InputStyle.view(Input.view, styles)`                                                     | `input`, `label`, `description`                                                                                                                                              | `isDisabled`, `isReadOnly`, `isInvalid`                                                                                       |
| Listbox     | `ListboxStyle.view(Languages.view, styles)`, `ListboxStyle.Multi.view(Tags.view, styles)` | `wrapper`, `button`, `backdrop`, `items`, `itemsScroll`, `item`, `group`, `heading`, `separator`                                                                             | `isVisible`, `isClosed`, `isDisabled`, `isReadOnly`, `isInvalid`; items: `isActive`, `isSelected`, `isDisabled`, `isReadOnly` |
| Menu        | `MenuStyle.view(Actions.view, styles)`                                                    | `wrapper`, `button`, `backdrop`, `items`, `itemsScroll`, `item`, `group`, `heading`, `separator`                                                                             | `isVisible`, `isClosed`, `isButtonDisabled`; items: `isActive`, `isDisabled`                                                  |
| Meter       | `MeterStyle.view(Meter.view, styles)`                                                     | `meter`, `label`, `fill`                                                                                                                                                     | `value`, `min`, `max`, `low`, `high`, `optimum`                                                                               |
| Nav         | `NavStyle.view(Nav.view, styles)`                                                         | `nav`, `link`                                                                                                                                                                | links: `isCurrent`, `index`                                                                                                   |
| Popover     | `PopoverStyle.view(Popover.view, styles)`                                                 | `wrapper`, `button`, `panel`, `backdrop`, `arrow`                                                                                                                            | `isVisible`, `isClosed`, `isDisabled`                                                                                         |
| Progress    | `ProgressStyle.view(Progress.view, styles)`                                               | `progress`, `label`, `track`, `indicator`                                                                                                                                    | `isIndeterminate`, `isComplete`, `value`, `min`, `max`                                                                        |
| RadioGroup  | `RadioGroupStyle.view(Plans.view, styles)`                                                | `group`, `option`, `label`, `description`                                                                                                                                    | `orientation`, `isDisabled`, `isReadOnly`; options: `isSelected`, `isDisabled`, `isReadOnly`, `index`                         |
| Select      | `SelectStyle.view(Select.view, styles)`                                                   | `select`, `label`, `description`                                                                                                                                             | `isDisabled`, `isInvalid`                                                                                                     |
| Slider      | `SliderStyle.view(Slider.view, styles)`                                                   | `root`, `label`, `track`, `filledTrack`, `thumb`                                                                                                                             | `isDragging`, `isDisabled`, `isReadOnly`, `orientation`                                                                       |
| Switch      | `SwitchStyle.view(Switch.view, styles)`                                                   | `button`, `label`, `description`                                                                                                                                             | `isChecked`, `isDisabled`, `isReadOnly`                                                                                       |
| Tabs        | `TabsStyle.view(Sections.view, styles)`                                                   | `tablist`, `tab`, `panel`                                                                                                                                                    | `orientation`; tabs and panels: `isActive`, `isDisabled`, `index`                                                             |
| Textarea    | `TextareaStyle.view(Textarea.view, styles)`                                               | `textarea`, `label`, `description`                                                                                                                                           | `isDisabled`, `isReadOnly`, `isInvalid`                                                                                       |
| Toast       | `ToastStyle.view(Toast.view, styles)`                                                     | `container`, `entry`, `dismiss`                                                                                                                                              | `dismiss`: `variant`                                                                                                          |
| Tooltip     | `TooltipStyle.view(Tooltip.view, styles)`                                                 | `trigger`, `panel`                                                                                                                                                           | `isVisible`, `isDisabled`                                                                                                     |
| VirtualList | `VirtualListStyle.view(VirtualList.view<Issue>(), styles)`                                | `container`                                                                                                                                                                  | none                                                                                                                          |

Combobox, Listbox, Menu and Tabs wrap the view of a `Combobox.create()`, `Listbox.create()`, `Menu.create()` or `Tabs.create()` bundle declared at module scope, and Toast the view of a `Toast.make()` module. `wrapper` is the element around a trigger that `toView` gets for Popover; Combobox, Listbox and Menu render their own. Combobox, Listbox and Menu render `itemsScroll` and `separator` only when they are styled. Combobox renders `button` only when `buttonContent` is set and `items` only while an item matches, and anchors the panel to `inputWrapper`. Toast's `container` and `entry` take styles without state.

Switch and Disclosure leave the thumb and the chevron to you: draw them inside `button` with `sx(...)`, from `isChecked` or `isOpen`. Disclosure's `animatePanel` wraps `panel` in two elements with no hook, which animate its height for 200 ms and clip its shadow and outline. A disabled Button keeps its element enabled, so a disabled `type: "submit"` button still submits its form.

HoverIntent and Nav render no elements: spread their bundles on your own. The wrapped Nav view takes no `h`, as `Nav.view` does, and `nav` takes styles without state. HoverIntent sets no `data-*` attribute; to fade its panel, keep the panel rendered and hide it with `visibility: hidden` while not `isVisible`, so the hidden panel takes no hover. Tooltip has no leave animation: render its panel while `isVisible`.

Calendar hands `toView` the bundles of the grid on show: days, months or years. Match on their `_tag` in `toView` and on `viewMode` in styles to lay out each grid. The heading text has an id but no bundle; put it inside `headingButton` in the day and month grids, and on its own element in the year grid, which has no heading button. @foldkit/ui marks a cell's state on `cell`, not on `cellButton`, so style the button from its flags. `isFocused` is the keyboard cursor while the grid has focus: the grid keeps DOM focus, so no cell matches `:focus-visible`. DatePicker renders its calendar in the panel through `toCalendarView` and styles it from `calendar`, which takes the same styles as `CalendarStyle.view`. It puts the trigger in a `div` inside `wrapper` that takes no class, so a flex or grid layout on `wrapper` arranges that `div`, not the trigger.

A disabled Fieldset disables the native controls inside it, but their components do not see it: pass its `isDisabled` to each one so their flags and hooks agree.

RadioGroup wraps the view of a `RadioGroup.create()` bundle declared at module scope; draw each radio mark inside `option` with `sx(...)`, from `isSelected`. Meter and Progress give each part the numbers @foldkit/ui renders, the value held between `min` and `max`. @foldkit/ui derives no region from Meter's `low`, `high` and `optimum`, so compare `value` with them. Progress sets no width on `indicator` while indeterminate: size it then with `minInlineSize`.

Animation styles the element it renders around `content`. Put `transition*` on the base style and the closed values under `isClosed`; for keyframe animations, run the enter one on the base style and the leave one while not `isShowing`. With `animateSize`, the element stays rendered while hidden, with `isClosed` set, inside two elements with no hook that animate its height for 200 ms.

DragAndDrop has no view: wrap `DragAndDrop.draggable` once and call the result where you called it. `isDragging` is true on every draggable of the model while one is dragged, `isDragged` only on that one, and neither while a press has not yet passed the activation threshold. `droppable` and `sortable` set no class or style: put `sx(...)` after them. Style the pointer ghost on your own element, with `h.Style` from `DragAndDrop.ghostStyle(model)` and `sx(...)`.

FileDrop hides its input visually, so style keyboard focus on `root` with `":has(:focus-visible)"`, which a mouse click does not match. VirtualList wraps the view `VirtualList.view<Item>()` returns. Its rows take no class and stretch the element `itemToView` returns to their height, so style that element.

## Lint

The `/foldkit-stylex` preset of [`@kutur-kit/oxc`](https://github.com/kutur-labs/kit/tree/main/packages/oxc#kutur-kitfoldkit-stylex) reports what the types cannot see: a second Class on an element or one on a part's bundle, `sx(...)` before a spread, a @foldkit/ui view used without its wrapper, condition keys that never match or rank differently than written, and StyleX's own Vite plugin. It also turns on StyleX's ESLint rules.

```sh
pnpm add -D @kutur-kit/oxc@alpha oxlint @stylexjs/eslint-plugin
```

Extend it in `oxlint.config.ts`:

```ts
import foldkitStylex from "@kutur-kit/oxc/foldkit-stylex";
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [foldkitStylex] });
```

Or in `.oxlintrc.json`, which extends configs by path:

```json
{ "extends": ["./node_modules/@kutur-kit/oxc/dist/foldkit-stylex.json"] }
```

## Testing

Assert flags through the attributes @foldkit/ui sets, never through generated class names, which change with every style edit:

```ts
Scene.scene(
  { update, view },
  Scene.given(model),
  Scene.click(Scene.role("checkbox")),
  Scene.expect(Scene.role("checkbox")).toHaveAttr("data-checked"),
);
```

## Requirements

- @foldkit/ui and foldkit 0.170 or later below 1.0, StyleX 0.19.1 or a later 0.19 release, Vite 8.3.6 or later below 9 and Effect 4.1.2 or a later 4.x release.
- `foldkitStylex()` in every Vite and Vitest config that loads the package.

## Limitations

- Vitest started with a mode other than `test` loads StyleX's Vite plugin, whose dev server keeps Vitest from exiting.
- A popover nested in another popover's panel with `portal: false` places its arrow by the outer panel's side, because the arrow follows the nearest Popover panel's `data-placement`.
- A `transform`, `filter` or `container-type` on an ancestor of an anchored component confines its fixed backdrop to that ancestor.
- Inactive tab panels are always hidden, so two mounted panels cannot cross-fade.
- A styles object annotated with `: PopoverStyle.Styles` is not checked for properties a part cannot set; write `satisfies PopoverStyle.Styles` instead.
- `light-dark()` colors stay as written for browsers without it, which then show no color for them.

## Migration from foldstylex

| foldstylex                                                              | This package                                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `sxAttrs(h, ...styles)`                                                 | `sx(...styles)`, last in the attribute list                                                                          |
| A wrapper module per component, such as `Button.view` with variant keys | `XStyle.view(X.view, styles)` around @foldkit/ui's own view; variants are your own styles chosen in a state function |
| `styledViewInputs(model, config)`                                       | The wrapped view in `h.submodel`                                                                                     |
| `":is([data-checked])"` keys                                            | `(state) => [styles.box, state.isChecked && styles.checked]`                                                         |
| `@foldstylex/tokens`                                                    | `@kutur-kit/foldkit-stylex-theme`, or your own `defineVars`                                                          |
| `stylex.vite()` and aliases to package sources                          | `foldkitStylex()`                                                                                                    |
