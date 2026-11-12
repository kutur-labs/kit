---
"@kutur-kit/oxc": minor
---

The new `kit/self-contained-function` rule reports an exported function that reads a binding of its own module other than a type, such as a helper, a constant or an import. Playwright sends such functions to a page as source, where those bindings do not exist. No preset turns it on; enable it in `overrides` for the modules that export functions for `page.evaluate` or `page.addInitScript`.
