---
'@graphql-tools/executor': minor
---

Add **planned execution**: `execute` / `executeSync` compile a plan once per `(schema, document, operationName)` into a WeakMap-cached structure and reuse it on later executes.

Eligible plans hold field maps, completion/resolve kinds, leaf and list-of-leaf facts, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys for variable `@skip`/`@include` (including fragment-level predicates), argument coercers, planned `coerceVariables` (empty / builtin-leaf / hoisted input-object coercers with graphql-js error-shape fallbacks), and bound `rootExecutions` / subfield execution lists. Warm executions reuse that plan so field collection, type classification, variable coercion, resolveInfo statics, and safe arg coercion are skipped; dense arrays use indexed completion. Leaf-list and object-list thin walks plus field-local async settle deepen the warm path further.

Pair with a document parser cache (e.g. Yoga `useParserAndValidationCache`) so the same query string keeps the same `DocumentNode` and the plan stays warm.

Measured warm-path wins vs previous master (process-isolated microbenches, Node 22): sync list ~+200%, async list ~+100%, async root fields ~+80%, nested default-resolver ~+137%, dense `@skip`/`@include` ~+45%+. Property-bag and related benches stay ahead of master on the warm planned path.

Docs: [Planned execution](https://www.graphql-tools.com/docs/execution-plan).
