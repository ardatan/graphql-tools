---
"@graphql-tools/utils": patch
---

Disallow new lines in paths when checking with `isValidPath`

A string may sometimes look like a path but is not (like an SDL of a simple
GraphQL schema). To make sure we don't yield false-positives in such cases,
we disallow new lines in paths (even thouhg most Unix systems support new
lines in file names).
