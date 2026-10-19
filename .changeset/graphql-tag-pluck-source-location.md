---
'@graphql-tools/graphql-tag-pluck': patch
---

Deduplicate dual-marker template plucks and convert Babel's 0-based columns to GraphQL `Source` 1-based offsets so standalone `#graphql` templates at column 0 no longer throw.
