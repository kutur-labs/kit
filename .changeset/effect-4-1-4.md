---
"@kutur-kit/access": patch
"@kutur-kit/audit": patch
---

`@kutur-kit/audit/drizzle/postgres` accepts the database of `drizzle-orm/effect-postgres` on Effect 4.1.3 and later, where `PgClient` no longer extends `SqlClient`. Tested with Effect 4.1.4.
