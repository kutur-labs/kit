---
"@kutur-kit/oxc": minor
---

`/foldkit-stylex` reports a `:hover` style outside `@media (hover: hover)`, through the new `kit/foldkit-stylex-hover-gate` rule, because touch browsers keep `:hover` after a tap. Chained keys such as `:hover:not(:focus-visible)` and `stylex.when.*(":hover")` keys count as hover too. When upgrading, write `":hover": { default: null, "@media (hover: hover)": value }`. StyleX takes no condition under a chained or `stylex.when` key, so put that key under `"@media (hover: hover)"` instead.

`kit/foldkit-stylex-unstyled-view` names the theme's namespace, such as `Listbox` from `@kutur-kit/foldkit-stylex-theme/listbox`, as the first fix for an unwrapped @foldkit/ui view, then the core's wrapper for a look of your own.
