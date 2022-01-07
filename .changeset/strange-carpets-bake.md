---
'@graphql-tools/utils': patch
---

fix pruneSchema

Schema pruning must be done in rounds, as pruning types will automatically prune any fields that rely on them (within mapSchema), but then the empty types may also require pruning.
