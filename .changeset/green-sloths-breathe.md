---
'@graphql-tools/prisma-loader': major
---

BREAKING CHANGE

- Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

- GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

- Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.
