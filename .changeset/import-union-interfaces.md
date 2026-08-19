---
'@graphql-tools/import': patch
---

Pull implemented interfaces (and their transitive dependencies) when a named import only references a union of those implementers. Fixes #3797.
