---
'@graphql-tools/external-fragment-loader': minor
---

Support GraphQL `ParseOptions` in the loader and direct resolver APIs, excluding the internal
`lexer` hook so each source is parsed with its own lexer. This includes token limits and syntax
options available in the installed GraphQL version.

Preserve the existing `noLocation: true` default and separate caches for each location mode.
Cached fragments retain their other parser settings; call `clearCache()` before changing those
options, or let entries expire via `cacheTTL`.
