---
'@graphql-tools/executor': minor
---

Executor now collects `@defer` fields the way graphql-js 17 `IncrementalExecutor` does: overlapping fields execute once in the parent group instead of again in the deferred patch. Subsequent payloads only contain fields that were not already delivered. When a field is nulled by error bubbling, deferred and streamed work at or under that path is cancelled (and ancestor patches that would write into the nulled subtree are dropped), matching graphql-js 17 `hasNulledPosition`. Default / non-incremental execution still uses the previous collect path.
