---
'@graphql-tools/load': major
'@graphql-tools/apollo-engine-loader': major
'@graphql-tools/code-file-loader': major
'@graphql-tools/git-loader': major
'@graphql-tools/github-loader': major
'@graphql-tools/graphql-file-loader': major
'@graphql-tools/json-file-loader': major
'@graphql-tools/module-loader': major
'@graphql-tools/url-loader': major
'@graphql-tools/utils': major
---

BREAKING CHANGE

- Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

- GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

- Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.
