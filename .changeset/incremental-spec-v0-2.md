---
'@graphql-tools/executor': minor
'@graphql-tools/utils': minor
---

`@graphql-tools/executor` can publish both incremental delivery payload formats from one execution kernel. Pass `incrementalSpec: 'v0.1' | 'v0.2'` on `execute` / `subscribe` / `normalizedExecutor` (also on `ExecutionRequest` for `executorFromSchema`). `'v0.1'` remains the default and keeps the existing `path` / `label` patches used with `multipart/mixed;deferSpec=20220824`. `'v0.2'` emits Apollo incremental v0.2 payloads (`pending` with `id` and `path`, `incremental` with `id` and optional `subPath`, `completed`) used with `multipart/mixed;incrementalSpec=v0.2`.

Field execution, `@defer` / `@stream` scheduling, and `AbortSignal` cancellation are shared. Spec-specific JSON is built by a publisher: v0.1 still yields `{ incremental, hasNext }`; v0.2 assigns ids when a pending group is first announced, groups streamed items under one pending path, and reports completion separately. Nested `@defer` patches are collected as children of the parent patch so v0.2 can announce the inner fragment only after the parent is pending, without making the nested fragment wait on the parent's promise (v0.1 sibling completion is unchanged aside from incremental array order).

Publisher state (`Map` / `Set` of ids) is allocated only for `'v0.2'`. `StreamGroup` is created only for v0.2 and only when items are actually streamed. v0.2 stream completion uses an open-count on the group instead of scanning `subsequentPayloads`.

`mergeIncrementalResult` still merges v0.1 `path` / `items` patches. For v0.2 it records `pending` ids on the execution result, writes deferred `data` at `pending.path + subPath`, appends streamed `items` onto the list at `pending.path`, and folds `completed.errors` into `errors`. `visitResult` flattens nested deferred patches so result visiting still sees fields that live under a child `@defer`.
