---
"@kutur-kit/access": patch
---

Condition spans of a permission the caller's restriction refused carry `access.denied_by: "restriction"`, as check spans do, so they are told apart from policies that match nothing.
