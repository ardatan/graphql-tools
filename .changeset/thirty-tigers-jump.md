---
'@graphql-tools/executor': patch
---

Properly propagate the original error in custom scalars.

Errors thrown in the `parseValue` function for custom scalars were not propagated correctly using the `originalError` property of the `GraphQLError` on invalid input. As a result, error codes from the `extensions.code` were not propagated correctly.
