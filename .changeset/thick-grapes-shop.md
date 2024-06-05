---
'@graphql-tools/utils': patch
---

If the given objects are arrays with the same length, merge the elements.

```ts
const a = [{ a: 1 }, { b: 2 }];
const b = [{ c: 3 }, { d: 4 }];
const result = mergeDeep(a, b); // [{ a: 1, c: 3 }, { b: 2, d: 4 }]
```
