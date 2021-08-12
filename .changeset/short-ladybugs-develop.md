---
'@graphql-tools/merge': major
'@graphql-tools/schema': minor
'@graphql-tools/stitch': minor
'@graphql-tools/utils': minor
---

- `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and `stitchSchemas` configurations

Breaking Changes;

- Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to `@graphql-tools/schema` package to prevent circular dependency between them.
- `mergeSchemasAsync` has been removed.
- Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment` from `@graphql-tools/merge` to `@graphql-tools/utils`.
