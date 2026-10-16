---
name: test-quality
description: Write or review tests that catch defects in application or library code. Apply when creating, editing or reviewing test files, test directories, fixtures or test plans, including .test, .spec and type tests.
---

# Test quality

- Test observable behavior, edge cases and regressions. Identify the defect each test would catch in production code; omit tests without one.
- Exercise the actual implementation. Do not copy its logic into tests or test functions defined only in fixtures.
- Do not retest dependency primitives, trivial constructors or behavior already guaranteed by the compiler. Use type tests for public inference and compatibility contracts.
- Assert outcomes independently of implementation details. Mock external boundaries only when needed; do not mock the behavior being tested.
- Prefer a few meaningful cases over duplicate assertions, snapshots of internal structure or coverage targets. Keep regression tests even when the fix is small.
- For Effect, use plain tests for synchronous code and `@effect/vitest`'s `it.effect` for effects. Supply dependencies through services or Layers. Use `TestClock` for time and `Effect.exit` when asserting success versus failure; avoid manual runners and real sleeps unless testing those boundaries.
- Keep fixtures minimal. Do not introduce production abstractions or test infrastructure solely to make a test possible.
