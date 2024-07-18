---
'@graphql-tools/delegate': patch
---

AggregateError errors are GraphQL located errors

Instead of transforming the AggregateError itself to a GraphQL located error.

This is because of two reasons:
- AggregateError wont lose the instanceof its class
- Expanding the AggregateError errors will each contain the proper locations
