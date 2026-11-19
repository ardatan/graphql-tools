---
'@graphql-tools/executor': minor
---

Add a cacheable execution plan (`compileExecutionPlan`) and use it on the default `execute` path for eligible documents.

Stable operations (no variable-conditional `@skip` / `@include` / `@defer`, and no `@defer` / `@stream`) compile once per schema+document+operation into a reusable execution plan: field maps, completion/resolve kinds, leaf and list-of-leaf facts, `skipIsTypeOf` for concrete objects, and argument coercers (static maps or bound closures with bare-variable fast path). Warm executions reuse that plan so field collection, type classification, and safe arg coercion are skipped; dense arrays use indexed completion. Async sibling fields still settle via the existing `promiseForObject` path (no separate queue runner). Documents that are not eligible keep the classic interpreter.

This is an in-memory execution plan interpreted by the default executor — not a generated executor / codegen path.
