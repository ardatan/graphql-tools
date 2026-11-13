---
'@graphql-tools/external-fragment-loader': major
---

Support GraphQL `ParseOptions` in the loader and direct resolver APIs, including token limits and
syntax options available in the installed GraphQL version. Cache parsed fragments separately by
parser settings so cached results cannot bypass a stricter limit or a different syntax mode.

**Breaking change:** `noLocation` now defaults to `false`, matching GraphQL's parser. Fragment ASTs
include source locations by default. Set `noLocation: true` explicitly to retain the previous
location-free behavior. Parser options that were previously ignored are now honored, so configured
limits may cause parsing to fail for documents that exceed them.
