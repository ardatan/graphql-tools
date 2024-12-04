---
'@graphql-tools/utils': patch
---

Handle array of primitives correctly

The bug was following;
```ts
mergeDeep([
  { options: ['$a', '$b'] },
  { options: ['$c'] },
  { options: ['$d', '$e'] },
])

// results in { options: [{}, {}] }
```
