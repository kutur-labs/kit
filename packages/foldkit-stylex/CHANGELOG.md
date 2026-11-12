# @kutur-kit/foldkit-stylex

## 0.1.0-alpha.3

### Minor Changes

- 8fd9aeb: In dev, `foldkitStylex()` links the stylesheets that a document's module scripts import into its head, ahead of StyleX's, so a server-rendered page first paints with the app's CSS instead of the browser's default font. Vite's client takes over each link when the scripts run instead of adding its rules again. When upgrading, delete a plugin of your own that links the client entry's stylesheets in dev.

## 0.1.0-alpha.2

### Minor Changes

- 12f43b9: Each `XStyle` namespace exports `Layers<List, Before>`, which checks each styles object in `List` against those in `Before` and those before it in `List`. A module that puts its own styles first, as the theme's `restyle` does, types the styles its callers add with it and keeps the checks that a direct call to `XStyle.view` makes.
- 12f43b9: `@kutur-kit/foldkit-stylex/testing` checks a page in Chromium for what axe-core leaves out. `audit` reports control edges whose most contrasting border, fill or shown mark stays below 3:1, keyboard focus that does not show, is covered or shows only as an outline or box-shadow ring below 3:1, targets under 24px other than links in a line of text, sideways scrolling, fixed boxes or their content past the viewport, cut-off text with and without WCAG 1.4.12's spacing, movement under reduced motion and states lost under forced colors, each finding with what to change. At `level: "AA"`, targets under 24px pass when spaced as WCAG 2.5.8 allows. The default `kit` level adds 44px targets under a coarse pointer, 2px focus outlines, focus changes it cannot measure and movement. An edge, mark or focus ring over an image or gradient gives an `unmeasured` finding, to check by eye. `{ hairline }` names fields that rest at a faint edge on a fill of their own, which the edge rule then asks for that fill, at least 1.05:1, outside forced colors. `recordMotion` logs CSS transitions and animations longer than a frame for it, and each audit takes only the records in its own scope. `variations` lists the browser contexts to run it in, a 320px touch phone included, as Vitest browser instances or Playwright projects. Both functions are self-contained, so Playwright can send them to the page.

  Under Vitest, `foldkitStylex()` now makes the compiled modules insert their CSS and keeps both packages out of pre-bundling, so browser tests measure the styled page without extra options, installed packages included.

## 0.1.0-alpha.1

### Patch Changes

- 462f9ba: The `foldkit` and `@foldkit/ui` peers stop at 0.170 (`>=0.170.0 <0.171.0`) instead of accepting any release below 1.0. Foldkit's next minor is expected to be its Blocks rewrite (foldkit/foldkit#1655), which removes `foldkit/submodel` and the component `view` exports this package wraps; the old range would have let an install pick that release and fail when the package loads. A daily job tests each newer Foldkit release, and a later version widens the range once one passes.

## 0.1.0-alpha.0

### Minor Changes

- 14e769e: First alpha release.
