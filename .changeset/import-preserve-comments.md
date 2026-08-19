---
'@graphql-tools/import': patch
---

Keep leading GraphQL comments (for example `# eslint-disable-next-line` above a query) when `#import` merges documents. Previously `processImport` reprinted definitions and dropped those comments from the merged source.
