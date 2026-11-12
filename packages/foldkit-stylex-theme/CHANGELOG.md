# @kutur-kit/foldkit-stylex-theme

## 0.1.0-alpha.2

### Minor Changes

- 12f43b9: A denser look. Controls are `size.control` tall, 32px, with `size.target` at 24px under a fine pointer; both are at least 44px under a coarse pointer, whatever an app-wide override sets. Type steps down to `fontSize.xs` 12px through `fontSize.lg` 16px, with new `lineHeight` and `fontWeight` groups, and `space` gains `xl`. Fields, triggers and buttons rest at a `color.border` hairline on the `color.subtle` fill and turn the edge to `color.control` on hover; a read-only field is a well, `color.text` on a mix of 8% `color.text` into `color.surface` that no token names. Panels draw their edge with `shadow.panel`'s ring, in `color.border`, and a border only under forced colors, and buttons rise on the new `shadow.control`. A primary button's hover moves its fill away from `color.surface`, so its label keeps its contrast. `motion.instant` times hover colors and a button's press, highlights appear at once and fade out, and panels open from a scale of 0.97 and leave faster than they enter. Marks are `size.mark` square. The greys mix less: `color.subtle` 5% and `color.border` 10%, and the dark surface and text are `#111113` and `#ededed`.

  Components follow: Listbox, Combobox and DatePicker share a 12rem width and trigger padding, Fieldset heads its group with the legend instead of a frame, Tabs and Nav keep 44px targets under a finger, a disabled calendar day is struck through only under forced colors, the Switch's track is `color.control` while off, drag-and-drop lists grow with their items, and Dialog, Toast and Tooltip take the new type and timing. A trigger's label ends in an ellipsis rather than pushing out its mark.

  Under forced colors, a primary button, the active list or menu item, Nav's current link and the selected calendar day opt out of forced color adjustment, so their HighlightText labels show on the Highlight fill instead of on Chromium's Canvas backplate, which hid them. Under a coarse pointer, the DatePicker panel keeps 1px of inline padding, so its 44px days fit a 320px screen.

- 12f43b9: Each component module exports one namespace named after the component, such as `Listbox` from `@kutur-kit/foldkit-stylex-theme/listbox`: @foldkit/ui's module with the member that makes the view (`view`, `create`, Toast's `make` or DragAndDrop's `draggable`) styled by the theme, `restyle` to layer your styles over the theme, and helpers that draw marks inside your elements, such as `Listbox.buttonContent`, `Checkbox.mark` and `Dialog.closeIcon`. The 28 `*Theme` looks are gone, and so are the indicators such as `checkboxIndicator`, `listboxButton`, `selectChevron` and `switchThumb`. `@foldkit/ui`, `foldkit` and `effect` are now peers. When upgrading, import the namespace in place of @foldkit/ui's module and the look, and call `Checkbox.view` or `Listbox.create()` instead of wrapping the view with the core. Replace a look spread into your styles with `X.restyle(layer)`, and drop a property the theme sets with `null` in that layer. Render the helpers where you rendered the indicators or your own `"▾"` and `"✓"`; the switch draws its thumb itself, so render its button empty.

  The look is neutral: `color.accent` defaults to `color.text` and `color.onAccent` to `color.surface`, and the greys `color.subtle`, `color.border`, `color.control` and `color.muted` mix `color.text` into `color.surface` in OKLab, so a preset that sets those two gets matching greys. A part that sets `color.surface` or `color.text` for itself sets the four greys, plus `color.accent` and `color.onAccent`, too. Edges are 1px, focus rings use `color.accent`, hover styles apply only under `@media (hover: hover)`, and under reduced motion parts still fade but no longer move. `color.hover` is renamed `color.subtle`; `color.focus`, `size.box`, `size.thumb` and `size.arrow` are gone, replaced by `color.accent` and the new `size.mark`; `radius.panel` follows `radius.control` unless set.

- 12f43b9: `@kutur-kit/foldkit-stylex-theme/testing` exports `tokenContrast`, which checks the theme's color pairs in a browser test: text, `color.muted` and `color.danger` at 4.5:1 on `color.surface` and `color.subtle`, `color.onAccent` at 4.5:1 on `color.accent`, and `color.control` and `color.accent` at 3:1 on both, in light and dark. It reads the tokens from the page's stylesheets, so app-wide overrides and presets count, and returns a `contrast` finding per failing pair that names the colors measured and the custom property to change. Translucent colors are measured over what they lie on, and a value that is no color gets one finding in place of its pairs. `{ preset }` measures a `ThemePreset` set on `<html>` for the call; `{ part }` measures under one element and reports a `derived` finding when that part sets `color.surface` or `color.text` but keeps the page's greys, `color.accent` or `color.onAccent`. Call it in Vitest browser mode or send it with Playwright's `page.evaluate`. `hairline` is the selector of the fields the theme rests at a hairline, for `audit`'s option of that name.

### Patch Changes

- Updated dependencies [12f43b9]
- Updated dependencies [12f43b9]
  - @kutur-kit/foldkit-stylex@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies [462f9ba]
  - @kutur-kit/foldkit-stylex@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- 14e769e: First alpha release.

### Patch Changes

- Updated dependencies [14e769e]
  - @kutur-kit/foldkit-stylex@0.1.0-alpha.0
