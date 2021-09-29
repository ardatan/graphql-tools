---
"@graphql-tools/batch-execute": patch
"@graphql-tools/delegate": patch
"@graphql-tools/utils": patch
---

batch-execute enhancements:
- fixes bugs with batched fragment definitions
- unpathed errors are now returned for all batch results
- the "graphqlTools" prefix is simplified down to just "_"
- new tests and documentation
