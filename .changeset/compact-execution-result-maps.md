---
'@graphql-tools/executor': patch
---

Use compact null-prototype maps for per-field execution results.

`executeFields` and `promiseForObject` now allocate result objects with a shared empty constructor then `Object.setPrototypeOf(..., null)`, instead of `Object.create(null)`. Dense responses create many of these maps; the named constructor gives V8 a reusable shape while keeping the same null-prototype semantics.
