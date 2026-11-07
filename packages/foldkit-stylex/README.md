# @kutur-kit/foldkit-stylex

StyleX for @foldkit/ui components. Wrap a component's view once with typed styles for each of its parts, written as functions of the part's state, and the package adds the CSS each component needs to work: the backdrop that covers the page, the panel's z-index, the hidden closed dialog and the like. It ships no colors, spacing or fonts; `@kutur-kit/foldkit-stylex-theme` is an optional look.

Tested with the lowest versions in `peerDependencies`.

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

## Style a component

Wrap @foldkit/ui's view once, at module scope, and use the result where you used the view. Each key of the styles object is a part; its value is StyleX styles or a function of the part's state:

```ts
import { Checkbox } from "@foldkit/ui";
import { CheckboxStyle, sx } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  box: {
    inlineSize: 24,
    blockSize: 24,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
  },
  checked: { backgroundColor: { default: "black", ":hover": "dimgray" } },
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

const terms = (isChecked: boolean, h: HtmlBuilder<Message>) =>
  checkboxView(
    {
      id: "terms",
      isChecked,
      onToggle: (isChecked) => Message.ToggledTerms({ isChecked }),
      toView: ({ checkbox, label }) =>
        h.div(
          [],
          [
            h.button([...checkbox], [h.span([sx(styles.tick, isChecked && styles.ticked)], ["✓"])]),
            h.label([...label], ["I accept the terms"]),
          ],
        ),
    },
    h,
  );
```

Submodel components such as Popover and Dialog take the wrapped view in `h.submodel({ view: popoverView, ... })`; `toView` gets bundles that already carry their styles. Components with class name inputs, such as Listbox, take their styles the same way, and their class name inputs and the `className` of `itemToConfig` no longer compile.

More styles objects after the first layer on top of it, property by property: `PopoverStyle.view(Popover.view, popoverTheme, { panel: styles.wide })`.

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

| Component        | Before your styles                                                                                                     | After your styles, only in their state              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Popover, Listbox | the wrapper around the trigger `position: relative`; the backdrop `position: fixed; inset: 0`; the panel `z-index: 10` |                                                     |
| Popover          | the arrow centred on the panel edge that faces the trigger and turned to point at it                                   |                                                     |
| Dialog           | `color: inherit` on the `<dialog>`; the backdrop covers the viewport; the panel `position: relative`                   | `display: none` on the `<dialog>` while not visible |
| Tabs             |                                                                                                                        | `display: none` on each inactive panel              |

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
| `translate` on Popover `arrow`, in any styles object                   | `"@kutur-kit/foldkit-stylex sets translate on this part so the component works. It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."`                                                  |
| A dynamic style on a part                                              | `"Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style."`                                                                                                                                  |
| A dynamic style in `sx`                                                | `"Pass static styles only. For a runtime value, set a custom property with h.Style({ '--x': value }) and read it with var(--x) in a static style."`                                                                             |
| `{ pannel: ... }`                                                      | `Did you mean to write 'panel'?`                                                                                                                                                                                                |
| `{ panel: ... }` on Listbox                                            | `"Listbox calls its panel items: put these styles under items."`                                                                                                                                                                |
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

| Component | Wrap                                                                                      | Parts                                                                                            | State                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Checkbox  | `CheckboxStyle.view(Checkbox.view, styles)`                                               | `checkbox`, `label`, `description`                                                               | `isChecked`, `isIndeterminate`, `isDisabled`, `isReadOnly`                                                                    |
| Dialog    | `DialogStyle.view(Dialog.view, styles)`                                                   | `dialog`, `backdrop`, `panel`, `title`, `description`, `closeButton`                             | `isVisible`, `isClosed`                                                                                                       |
| Listbox   | `ListboxStyle.view(Languages.view, styles)`, `ListboxStyle.Multi.view(Tags.view, styles)` | `wrapper`, `button`, `backdrop`, `items`, `itemsScroll`, `item`, `group`, `heading`, `separator` | `isVisible`, `isClosed`, `isDisabled`, `isReadOnly`, `isInvalid`; items: `isActive`, `isSelected`, `isDisabled`, `isReadOnly` |
| Popover   | `PopoverStyle.view(Popover.view, styles)`                                                 | `wrapper`, `button`, `panel`, `backdrop`, `arrow`                                                | `isVisible`, `isClosed`, `isDisabled`                                                                                         |
| Slider    | `SliderStyle.view(Slider.view, styles)`                                                   | `root`, `label`, `track`, `filledTrack`, `thumb`                                                 | `isDragging`, `isDisabled`, `isReadOnly`, `orientation`                                                                       |
| Tabs      | `TabsStyle.view(Sections.view, styles)`                                                   | `tablist`, `tab`, `panel`                                                                        | `orientation`; tabs and panels: `isActive`, `isDisabled`, `index`                                                             |
| Toast     | `ToastStyle.view(Toast.view, styles)`                                                     | `container`, `entry`, `dismiss`                                                                  | `dismiss`: `variant`                                                                                                          |

Listbox and Tabs wrap the view of a `Listbox.create()` or `Tabs.create()` bundle declared at module scope, and Toast the view of a `Toast.make()` module. `wrapper` is the element around a trigger that `toView` gets for Popover; Listbox renders its own. Listbox renders `itemsScroll` and `separator` only when they are styled. Toast's `container` and `entry` take styles without state.

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
