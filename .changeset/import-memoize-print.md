---
'@graphql-tools/import': patch
---

perf(import): memoize `print` per node when assembling imported definitions

`processImport` de-duplicates the collected definitions by printing each one to
SDL and comparing the strings. A single definition node appears in many of the
dependency sets (any widely-referenced type is pulled in by every definition
that depends on it), so `print` was called roughly O(n²) times for n unique
nodes. For large, densely-connected schemas this print/visit work dominates
import time.

Memoizing `print` by node identity makes each unique node print at most once.
`print` is a pure function of its node, so the output is identical; this is a
pure performance change. On a ~12k-line schema imported across three projects,
this reduced a downstream codegen pass from ~133s to ~17s.
