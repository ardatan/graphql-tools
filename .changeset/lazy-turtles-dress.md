---
'@graphql-tools/batch-execute': major
'@graphql-tools/delegate': major
'@graphql-tools/links': major
'@graphql-tools/utils': major
'@graphql-tools/wrap': major
---

BREAKING CHANGES;

- Rename `Request` to `ExecutionRequest`
- Drop unnecessary `GraphQLResolveInfo` in `ExecutionRequest`
- Add required `operationType: OperationTypeNode` field in `ExecutionRequest`
- Add `context` in `createRequest` and `createRequestInfo` instead of `delegateToSchema`

> It doesn't rely on info.operation.operationType to allow the user to call an operation from different root type.
And it doesn't call getOperationAST again and again to get operation type from the document/operation because we have it in Request and ExecutionParams
https://github.com/ardatan/graphql-tools/pull/3166/files#diff-d4824895ea613dcc1f710c3ac82e952fe0ca12391b671f70d9f2d90d5656fdceR38

Improvements;
- Memoize `defaultExecutor` for a single `GraphQLSchema` so allow `getBatchingExecutor` to memoize `batchingExecutor` correctly.
- And there is no different `defaultExecutor` is created for `subscription` and other operation types. Only one executor is used.

> Batch executor is memoized by `executor` reference but `createDefaultExecutor` didn't memoize the default executor so this memoization wasn't working correctly on `batch-execute` side.
https://github.com/ardatan/graphql-tools/blob/remove-info-executor/packages/batch-execute/src/getBatchingExecutor.ts#L9
