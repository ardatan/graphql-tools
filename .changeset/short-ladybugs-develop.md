---
'@graphql-tools/merge': major
'@graphql-tools/schema': minor
'@graphql-tools/stitch': minor
'@graphql-tools/utils': minor
'@graphql-tools/code-file-loader': major
---

`schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and `stitchSchemas` configurations

Breaking Changes;

- Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to `@graphql-tools/schema` package to prevent circular dependency between them.
- `mergeSchemasAsync` has been removed.
- Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment` from `@graphql-tools/merge` to `@graphql-tools/utils`.
- Code File Loader no more returns multiple sources for each plucked GraphQL SDL. This breaks other tools such as GraphQL Code Generator.
