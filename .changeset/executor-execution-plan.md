---
'@graphql-tools/executor': minor
---

Add **planned execution**: `execute` / `executeSync` compile a plan once per `(schema, document, operationName)` into a WeakMap-cached structure and reuse it on later executes.

Eligible plans hold field maps, completion/resolve kinds, leaf and list-of-leaf facts, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys for variable `@skip`/`@include` (including fragment-level predicates), argument coercers, planned `coerceVariables` (empty / builtin-leaf / hoisted input-object coercers with graphql-js error-shape fallbacks), and bound `rootExecutions` / subfield execution lists. Warm executions reuse that plan so field collection, type classification, variable coercion, resolveInfo statics, and safe arg coercion are skipped; dense arrays use indexed completion.

Pair with a document parser cache (e.g. Yoga `useParserAndValidationCache`) so the same query string keeps the same `DocumentNode` and the plan stays warm.

Measured warm-path wins vs previous master (interleaved vitest, Node 22): dense float list ~+112%, property-bag ~+33%, async list ~+22%, nested default-resolver ~+16%, dense `@skip`/`@include` ~+63-67% (plan-extra on top of collect-layer predicates), heavy coerce+execute ~+67-74%. Sync list and small coerce+execute stay ~flat.

Docs: [Planned execution](https://www.graphql-tools.com/docs/execution-plan).
