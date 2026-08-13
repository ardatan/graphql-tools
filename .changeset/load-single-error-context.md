---
'@graphql-tools/load': patch
---

Always include "Failed to find any GraphQL type definitions" context when loaders error, even if there is only one error. Fixes #7406.
