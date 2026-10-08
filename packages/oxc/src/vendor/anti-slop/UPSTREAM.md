# anti-slop

Source: https://github.com/dmmulroy/anti-slop
Revision: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`

Copied `src/` without upstream test files. Licenses, including the nested eslint-stylistic license, are retained.

Used by the `/anti-slop` preset. Vendored files are typechecked but excluded from linting and formatting. Keep `@oxlint/plugins` pinned to the Oxlint version.

Local change: `shared/dictionary-types.ts` uses `?? null` for an indexed access to compile with `noUncheckedIndexedAccess`. Preserve this when updating.
