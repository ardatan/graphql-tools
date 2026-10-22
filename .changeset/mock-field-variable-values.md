---
'@graphql-tools/mock': minor
---

Type-field mock functions now receive the operation's variable values as a second argument.

`Query: () => ({ user: (args, variables) => ... })` already got the field's resolved arguments. The second argument is `info.variableValues`, so a mock can assert how the operation was called without replacing every field with a resolver.
