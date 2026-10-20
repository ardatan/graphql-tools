---
'@graphql-tools/executor': minor
---

Executor now collects `@defer` fields the way graphql-js 17 `IncrementalExecutor` does: overlapping fields execute once in the parent group instead of again in the deferred patch. Subsequent payloads only contain fields that were not already delivered. Default / non-incremental execution still uses the previous collect path.
