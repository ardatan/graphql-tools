---
'@graphql-tools/utils': minor
---

Add new incremental delivery fields to the `ExecutionResult` type.

The `id`, `subPath`, `pending` and `completed` properties specified by [in the following proposal](https://github.com/graphql/defer-stream-wg/discussions/69) are now defined within `ExecutionResult`.
