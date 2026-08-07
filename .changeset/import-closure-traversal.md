---
'@graphql-tools/import': patch
---

perf(import): remove redundant work in `addDefinition`'s dependency traversal

`addDefinition` recurses across the whole dependency graph while assembling each
definition's imported dependencies. Two things were repeated on every call:

- `visitedFiles.get(filePath)` — invariant for the duration of the
  `processImport` call, so it's now looked up once and hoisted out of the
  recursion.
- the per-field dependency-name derivation (`visitFieldDefinitionNode` /
  `visitInputValueDefinitionNode` into a fresh `Map`) — a pure function of the
  field node and the file's static dependency map, so it's now memoized by field
  identity instead of recomputed every time the owning definition is added to a
  set.

Pure performance change; output is unchanged (the existing import tests pass and
a real-world ~12k-line schema produces byte-identical results). Building on the
`print` memoization, this took the same codegen pass from ~17s to ~13s. The
remaining cost is the O(n²) shape of the closure traversal itself (each
definition's transitive set is still rebuilt independently); reducing that is
left for a follow-up as it's a more invasive change.
