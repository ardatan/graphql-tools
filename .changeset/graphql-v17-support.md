---
'@graphql-tools/schema': minor
'@graphql-tools/executor': major
'@graphql-tools/utils': major
---

This release aims to support GraphQL v17, and align the existing executor implementation with the latest GraphQL v17 API changes. The following changes have been made:

- `getAsyncHelpers` has been introduced in `GraphQLResolveInfo`. `track` method in there is used whenever `waitUntil` is available as in Yoga's [Explicit Resource Management](
  https://the-guild.dev/graphql/yoga-server/docs/features/explicit-resource-management
)
- `getAbortSignal` is introduced in `GraphQLResolveInfo` which was already available in this executor implementation before as in Yoga's [Execution Cancellation](
  https://the-guild.dev/graphql/yoga-server/docs/features/execution-cancellation
)
- `GraphQLResolveInfo` automatically aligns `variableValues` according to the GraphQL version for better compatibility. In GraphQL v17 and above, `variableValues` follows the wrapped shape (`{ coerced, sources }`) expected by GraphQL APIs. In GraphQL v16 and below, `variableValues` remains a flat map as in previous versions.
- If you have `__serialize` and `__parseValue` methods for your custom scalar resolvers, it will be automatically mapped to `coerceInputValue` and `coerceOutputValue` methods in GraphQL v17. This change ensures that your custom scalar resolvers are compatible with the latest GraphQL version and can handle input and output values correctly.
- **BREAKING**: `@graphql-tools/executor`'s `getVariableValues` now returns `{ variableValues }` on success, where `variableValues` is a `VariableValues` object (`{ coerced, sources }`). On failure, it returns `{ errors }`.
- **BREAKING**: `collectFields`, `shouldIncludeNode`, `getDeferValues`, and `collectSubFields` now need a `VariableValues` object instead of `Record<string, any>` for the `variableValues` argument.
- **BREAKING**: `visitResult`'s `variableValues` argument is now `VariableValues` object instead of `Record<string, any>`. This change aligns with GraphQL v17's handling of variable values and provides more flexibility in working with variables during execution.
