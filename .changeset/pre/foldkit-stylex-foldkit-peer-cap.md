---
"@kutur-kit/foldkit-stylex": patch
---

The `foldkit` and `@foldkit/ui` peers stop at 0.170 (`>=0.170.0 <0.171.0`) instead of accepting any release below 1.0. Foldkit's next minor is expected to be its Blocks rewrite (foldkit/foldkit#1655), which removes `foldkit/submodel` and the component `view` exports this package wraps; the old range would have let an install pick that release and fail when the package loads. A daily job tests each newer Foldkit release, and a later version widens the range once one passes.
