---
'@graphql-tools/import': patch
---

`processImport` keeps the AST nodes collected from `#import` instead of printing every definition to SDL and parsing that string again.

A type that many other types depend on is stored in each of those sets, so the same node was printed over and over. Two files can also carry identical SDL (for example the same `type Query` after a field import). Those are still de-duplicated: skip a node already seen, and skip a second node that prints to the same SDL. The first node is kept. Leading comments stay on that node (for example `# eslint-disable-next-line` above a query).

```ts
const document = processImport('./schema.graphql');
// document.definitions are the nodes parsed from the imported files
```
