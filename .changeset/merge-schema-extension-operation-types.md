---
'@graphql-tools/merge': patch
---

Fix `mergeTypeDefs` (and `useSchemaDefinition`, on by default) silently dropping backfilled root operation types when the source document contains a `extend schema` block that declares no operation types itself (e.g. `extend schema @link(...)`).

On graphql@17, `SchemaExtensionNode.operationTypes` is `undefined` for such a block instead of `[]`. The backfill logic built the missing `query`/`mutation`/`subscription` entries into a fresh, disconnected array instead of the one attached to the schema node, so they were computed and then discarded — leaving the merged output with an empty `extend schema { ... }` and forcing consumers to declare `schema { query: Query }` manually.
