---
'@graphql-tools/batch-execute': major
'@graphql-tools/delegate': major
'@graphql-tools/links': major
'@graphql-tools/utils': major
'@graphql-tools/wrap': major
---

BREAKING CHANGES;

- Drop unnecessary `GraphQLResolveInfo` in `ExecutionParams`
- Add required `operationType: OperationTypeNode` field in `ExecutionParams`

Improvements;

- Memoize `defaultExecutor` for a single `GraphQLSchema` so allow `getBatchingExecutor` to memoize `batchingExecutor` correctly.
