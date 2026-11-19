---
'@graphql-tools/executor': minor
---

Add a cacheable execution plan (`compileExecutionPlan`) and use it on the default `execute` path for eligible documents.

Eligible operations (no `@defer` / `@stream`) compile once per schema+document+operation into a reusable execution plan: field maps, completion/resolve kinds, leaf and list-of-leaf facts, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys for variable `@skip`/`@include`, argument coercers, and a planned `coerceVariables` graph (empty / builtin-leaf fast path / bound getVariableValues for inputs). Warm executions reuse that plan so field collection, type classification, variable coercion, resolveInfo statics, stream checks, and safe arg coercion are skipped; dense arrays use indexed completion. Async sibling fields still settle via `promiseForObject` (no separate queue runner). Incremental documents keep the classic interpreter.

This is an in-memory execution plan interpreted by the default executor — not a generated executor / codegen path.
