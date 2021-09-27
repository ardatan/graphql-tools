---
"@graphql-tools/batch-execute": patch
"@graphql-tools/delegate": patch
"@graphql-tools/utils": patch
"@graphql-tools/website": patch
---

batch-execute enhancements:
- unpathed errors are now returned for all batch results
- the "graphqlTools" prefix is simplified down to just "_"
- operationType may now be inferred from batched documents
- new tests and documentation
