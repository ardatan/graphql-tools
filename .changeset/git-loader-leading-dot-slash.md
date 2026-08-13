---
'@graphql-tools/git-loader': patch
---

Strip leading `./` when matching git tree paths in `resolveGlobs`, while preserving `./` on resolved pointers. Fixes #5243.
