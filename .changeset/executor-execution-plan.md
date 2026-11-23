---
'@graphql-tools/executor': minor
---

Add **planned execution**: public `execute` / `executeSync` get-or-compile a plan once per `(schema, document, operationName)`, or accept a plan-only `ExecuteArgs` (`execute({ plan, ... })`). `ExecutionArgs` stays the document-mode interface (`schema` + `document`) so existing `interface X extends ExecutionArgs` extensions remain compatible. You can also call `compileExecutionPlan` once and pass the plan for warm reuse. Plans hold field maps, kind-discriminated FieldPlans, coercers, and bound executions for the warm path.

Eligible plans hold field maps and kind-discriminated `FieldPlan` variants (`leaf` / `leafList` / `object` / `abstract` / `list`, matching interface stems). List item facts are flattened onto `LeafListFieldPlan` / `ListFieldPlan` (no nested `PlannedLeafList` / `PlannedObjectList`). Also resolve kind, `skipIsTypeOf`, planned `resolveInfoStatic`, FieldNode-stable keys for variable `@skip`/`@include` (including fragment-level predicates), argument coercers, planned `coerceVariables` (empty / builtin-leaf / hoisted input-object coercers with graphql-js error-shape fallbacks), and bound `rootExecutions` / subfield execution lists. Warm executions reuse that plan so field collection, type classification, variable coercion, resolveInfo statics, and safe arg coercion are skipped; dense arrays use indexed completion. Leaf-list and object-list thin walks plus field-local async settle deepen the warm path further.

Pair with a document parser cache (e.g. Yoga `useParserAndValidationCache`) so the same query string keeps the same `DocumentNode` and the plan stays warm.

Measured warm-path wins vs previous master (process-isolated microbenches, Node 22): sync list ~+210%, async list ~+100%, async root fields ~+85%, nested default-resolver ~+140%, dense `@skip`/`@include` ~+45%+. Property-bag and related benches stay ahead of master on the warm planned path.

Docs: [Planned execution](https://www.graphql-tools.com/docs/planned-execution).
