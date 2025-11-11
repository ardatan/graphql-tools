---
'@graphql-tools/utils': patch
---

Support "federation/subgraph style" schemas in `astFromSchema` and `printSchemaWithDirectives`

If a `GraphQLSchema` doesn't have any defined operation types, we should print the schema definition as an extension rather than omitting it entirely.
They are not a valid schema on their own, but they are valid subgraph schemas in a federation setup, and it is possible to build such schemas with `assumeValid` options.

```ts
// A schema without defined root types
buildSchema(
  /* GraphQL */ `
    extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

    type User @key(fields: "id") {
      id: ID!
      username: String
    }
  `,
  { assumeValid: true, assumeValidSDL: true }
)
```
