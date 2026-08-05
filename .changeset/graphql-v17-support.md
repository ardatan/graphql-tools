---
'@graphql-tools/schema': minor
'@graphql-tools/executor': major
'@graphql-tools/utils': major
---

This release adds GraphQL v17 support and aligns the existing executor implementation with the latest GraphQL v17 API changes. The following changes are included:

- `getAsyncHelpers` is now available on `GraphQLResolveInfo`. Its `track` method is used whenever `waitUntil` is available, as in Yoga's [Explicit Resource Management](
  https://the-guild.dev/graphql/yoga-server/docs/features/explicit-resource-management
)
- `getAbortSignal` is now available on `GraphQLResolveInfo`, matching behavior that was already available in this executor implementation, as in Yoga's [Execution Cancellation](
  https://the-guild.dev/graphql/yoga-server/docs/features/execution-cancellation
)
- `GraphQLResolveInfo` automatically aligns `variableValues` according to the GraphQL version for better compatibility. In GraphQL v17 and above, `variableValues` follows the wrapped shape (`{ coerced, sources }`) expected by GraphQL APIs. In GraphQL v16 and below, `variableValues` remains a flat map as in previous versions.
- If your custom scalar resolvers define `__serialize` and `__parseValue`, they are automatically mapped to `coerceOutputValue` and `coerceInputValue` in GraphQL v17.
- **BREAKING**: `@graphql-tools/executor`'s `getVariableValues` now returns `{ variableValues }` on success, where `variableValues` is a `VariableValues` object (`{ coerced, sources }`). On failure, it returns `{ errors }`.
- **BREAKING**: `collectFields`, `shouldIncludeNode`, `getDeferValues`, and `collectSubFields` now need a `VariableValues` object instead of `Record<string, any>` for the `variableValues` argument.
- `visitResult` now internally normalizes `ExecutionRequest.variables` into a `VariableValues`-compatible shape (`{ coerced, sources }`) before traversing selections.
