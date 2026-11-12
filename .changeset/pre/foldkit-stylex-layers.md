---
"@kutur-kit/foldkit-stylex": minor
---

Each `XStyle` namespace exports `Layers<List, Before>`, which checks each styles object in `List` against those in `Before` and those before it in `List`. A module that puts its own styles first, as the theme's `restyle` does, types the styles its callers add with it and keeps the checks that a direct call to `XStyle.view` makes.
