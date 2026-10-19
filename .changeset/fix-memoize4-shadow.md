---
'@graphql-tools/utils': patch
---

`memoize4` no longer throws on partial cache hits.

`memoize4` nested a `const cache4 = new WeakMap()` inside `if (!cache4)`, which shadowed the outer binding. The map was stored correctly on the first miss, but the outer `cache4` stayed `undefined`, so the next call that shared the first three arguments and missed on the fourth crashed with `TypeError: Cannot read properties of undefined (reading 'get')`.

**Use case:** any helper wrapped in `memoize4` (or code that hits the same WeakMap path) called twice with the same first three object keys and a different fourth key — e.g. memoizing work keyed by `(schema, type, field, arg)`.

```ts
const memoized = memoize4((a, b, c, d) => heavy(a, b, c, d));
memoized(schema, type, field, argA); // ok
memoized(schema, type, field, argB); // previously threw; now returns a fresh memoized value
```

The fix assigns to the outer `let cache4` (same pattern `memoize5` already used). Regression coverage covers both `memoize4` and `memoize5`.
