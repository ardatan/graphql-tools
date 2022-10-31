---
'@graphql-tools/utils': major
---

_BREAKING_: `checkValidationErrors` has been dropped and `validateGraphQlDocuments` now accepts `DocumentNode[]` instead and it throws the original `GraphQLError`s with the correct stack trace
