---
'@graphql-tools/git-loader': patch
---

Parse `git ls-tree` output with LF-safe line splitting and normalize paths so `resolveGlobs` matches correctly on Windows. Fixes #5243.
