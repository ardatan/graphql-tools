---
'@graphql-tools/executor': minor
---

Add a cacheable execution plan (`compileExecutionPlan`) and use it on the default `execute` path for eligible documents.

Stable operations (no variable-conditional `@skip` / `@include` / `@defer`, and no `@defer` / `@stream`) compile once per schema+document+operation: pre-collected field maps, per-field leaf/default-path facts, and static argument maps when args do not reference variables. Warm executions reuse that plan cache so field collection, field-def lookup, and safe arg coercion are skipped. Documents that are not eligible keep the existing interpreter path.

This is an in-memory execution plan interpreted by the default executor — not a generated executor / codegen path. The plan surface is meant to be reusable later by stitching and federation.
