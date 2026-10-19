---
"@kutur-kit/access": patch
---

`Drizzle.where` sends `oneOf` values as text for PostgreSQL to parse as the column's type, so lists mixing whole and fractional numbers no longer fail to encode.
