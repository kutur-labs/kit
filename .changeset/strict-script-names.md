---
"@kutur-kit/strict": minor
---

`pnpm install` fails when a script has the name of a pnpm command, such as `deploy`, because `pnpm deploy` runs pnpm's command instead of the script. When upgrading, rename such scripts. Scripts that pnpm runs by name pass; `clean`, `purge`, `rebuild`, `rb` and `tasks` in a workspace package pass only when the root has the same script.
