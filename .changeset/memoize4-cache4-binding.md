---
'@graphql-tools/utils': patch
---

Align `memoize4` third-level cache initialization with the `let` + reassignment pattern used by `memoize3` / `memoize5`.

Previously a nested `const cache4` inside `if (!cache4)` shadowed the outer binding. Runtime behavior was already safe (that branch stores the map and returns), but the declaration was easy to misread and fragile if the early return were removed. The helper now assigns to the outer `let cache4` instead, with regression tests for the third-level cache path.
