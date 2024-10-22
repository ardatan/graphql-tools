---
'@graphql-tools/federation': patch
---

If required non-nullable key is null, do not send it to the subgraph;

See optimizations.test.ts for more details.
