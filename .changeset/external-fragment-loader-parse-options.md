---
'@graphql-tools/external-fragment-loader': major
---

Support GraphQL `ParseOptions` in the loader and direct resolver APIs, excluding the internal
`lexer` hook so each source is parsed with its own lexer. This includes token limits and syntax
options available in the installed GraphQL version. Cached fragments retain their original
parser settings; call `clearCache()` before changing options, or let entries expire via `cacheTTL`.

**Breaking change:** `noLocation` now defaults to `false`, matching GraphQL's parser. Fragment ASTs
include source locations by default. Set `noLocation: true` explicitly to retain the previous
location-free behavior. Parser options that were previously ignored are now honored, so configured
limits may cause parsing to fail for documents that exceed them.
Changing parser options, including `noLocation`, no longer creates separate fragment-map cache
entries.
