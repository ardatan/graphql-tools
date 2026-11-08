---
'@graphql-tools/executor': patch
---

When a `@stream` list item fails with a non-null error (for example `initialCount: 0` over `[String!]` where index 1 is null), the executor used to cancel earlier stream records under the list path, leave later indexes running when `nulledPaths` was uninitialized on stream-only operations, and prune an enclosing `@defer` payload's empty list placeholder (`{ field: [] }`) once that list path was recorded as nulled. Align stream null-bubble delivery with graphql-js: keep already-resolved earlier items, stop subsequent indexes, and still publish the deferred empty-list payload before the stream error payload.
