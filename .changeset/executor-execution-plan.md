---
'@graphql-tools/executor': minor
---

Add **planned execution**: public `execute` / `executeSync` get-or-compile a plan once per `(schema, document, operationName)`, then run via opaque `plan.execute(...)`. You can also call `compileExecutionPlan` and reuse `plan.execute` directly.

Eligible plans hold field maps, completion/resolve kinds (kind-discriminated `FieldPlan`), leaf and list-of-leaf facts, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys for variable `@skip`/`@include` (including fragment-level predicates), argument coercers, planned `coerceVariables` (empty / builtin-leaf / hoisted input-object coercers with graphql-js error-shape fallbacks), and bound `rootExecutions` / subfield execution lists. Warm executions reuse that plan so field collection, type classification, variable coercion, resolveInfo statics, and safe arg coercion are skipped; dense arrays use indexed completion. Leaf-list and object-list thin walks plus field-local async settle deepen the warm path further.

Pair with a document parser cache (e.g. Yoga `useParserAndValidationCache`) so the same query string keeps the same `DocumentNode` and the plan stays warm.

Measured warm-path wins vs previous master (process-isolated microbenches, Node 22): sync list ~+210%, async list ~+100%, async root fields ~+85%, nested default-resolver ~+140%, dense `@skip`/`@include` ~+45%+. Property-bag and related benches stay ahead of master on the warm planned path.

Docs: [Planned execution](https://www.graphql-tools.com/docs/planned-execution).
