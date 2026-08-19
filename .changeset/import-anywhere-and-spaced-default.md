---
'@graphql-tools/graphql-file-loader': patch
'@graphql-tools/import': patch
---

`# import "./file.graphql"` (space after `#`) is a valid default import, and `#import` is processed even when it is not the first non-blank line of the file.
