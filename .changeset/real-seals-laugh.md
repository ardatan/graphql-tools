---
'@graphql-tools/federation': patch
---

Fix Supergraph Manager Event Emitter not calling every listener when at least one has been
registered using `once` method.
