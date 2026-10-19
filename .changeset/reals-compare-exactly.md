---
"@kutur-kit/access": patch
---

`Drizzle.where` compares `real` columns with `oneOf` lists as doubles, so a value such as `0.1` no longer matches the different single-precision value stored for it, as `Condition.matches` already decided.
