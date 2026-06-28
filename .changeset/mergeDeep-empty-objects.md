---
"@graphql-tools/utils": patch
---

Fix `mergeDeep` returning `undefined` instead of `{}` when merging two or more empty objects.

Previously the output accumulator was only initialized inside the per-key loop, so merging
sources with no own keys (e.g. `mergeDeep([{}, {}])`) left it `undefined`. This silently dropped
empty-object values during nested merges (`{ data: {} }` became `{ data: undefined }`), which could
surface as "Cannot return null for non-nullable field" errors when stitching schemas. The
accumulator is now initialized as soon as an object source is encountered.
