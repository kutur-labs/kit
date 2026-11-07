---
"@kutur-kit/strict": minor
---

Fails installs when a `minimumReleaseAgeExclude` entry is not one package name with exact versions, or `minimumReleaseAgeExcludePrune` is not `true`. Each reported problem now says why it fails the install and how to fix it. `findViolations` is renamed to `findCatalogViolations`.
