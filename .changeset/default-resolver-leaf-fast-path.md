---
'@graphql-tools/executor': patch
---

Fields that rely on GraphQL's default field resolver no longer build argument maps or `GraphQLResolveInfo` when the source value is a plain leaf property (not a method). Leaf shape is memoized per field, the property is serialized directly (including non-null checks), and method-valued leaves are invoked once without a second property read. `schemaCoordinateInErrors` uses a slim `{ fieldName, parentType }` on that error path. Custom field resolvers and a custom `fieldResolver` override are unchanged.
