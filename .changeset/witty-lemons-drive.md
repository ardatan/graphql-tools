---
'@graphql-tools/federation': patch
---

Filter errors as null in the projected key

If the key field has `Error`, do not send them to the subgraphs as objects but `null`.
