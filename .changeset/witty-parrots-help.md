---
'@graphql-tools/code-file-loader': patch
---

"@graphql-tools/code-file-loader" no more returns multiple sources for each plucked GraphQL SDL. This breaks other tools such as GraphQL Code Generator.
