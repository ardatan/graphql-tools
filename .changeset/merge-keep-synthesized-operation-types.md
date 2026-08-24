---
'@graphql-tools/merge': patch
---

Write the synthesized default operation types back onto the schema definition node, so merging a `schema` extension that has no operation block (federation SDL, for example) still produces a query root on `graphql@17`.
