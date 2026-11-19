---
'@graphql-tools/executor': minor
---

Add a cacheable execution plan (`compileExecutionPlan`) and use it on the default `execute` path.

Operations compile once per schema+document+operation into a reusable plan: field maps, completion/resolve kinds, leaf and list-of-leaf facts, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys (including variable `@skip`/`@include`), argument coercers, planned `coerceVariables` (empty / typed leaf·list·input-object graph via `coerceInputValue` with sources, else bound getVariableValues for defaults/errors), and bound `rootExecutions` / subfield execution lists for stable docs. `@defer` / `@stream` set `hasIncremental` — runtime keeps the incremental interpreter while still attaching per-field plan facts. Warm non-incremental executions skip field collection, type classification, variable coercion, resolveInfo statics, stream checks, and safe arg coercion; dense arrays use indexed completion. Async siblings settle via `promiseForObject` (no separate queue runner).

This is an in-memory execution plan interpreted by the default executor — not a generated executor / codegen path.
