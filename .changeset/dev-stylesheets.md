---
"@kutur-kit/foldkit-stylex": minor
---

In dev, `foldkitStylex()` links the stylesheets that a document's module scripts import into its head, ahead of StyleX's, so a server-rendered page first paints with the app's CSS instead of the browser's default font. Vite's client takes over each link when the scripts run instead of adding its rules again. When upgrading, delete a plugin of your own that links the client entry's stylesheets in dev.
