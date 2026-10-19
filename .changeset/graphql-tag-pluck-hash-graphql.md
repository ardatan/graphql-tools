---
'@graphql-tools/graphql-tag-pluck': minor
---

Recognize `#graphql` at the start of template literals by default.

Until now, untagged template literals were only plucked when they had a leading block comment such as `/* GraphQL */` (`gqlMagicComment`). Many setups instead use a `#graphql` marker *inside* the string:

```ts
export const typeDefs = `#graphql
  type Query {
    hello: String
  }
`
```

That marker is GraphQL source text, not a JavaScript leading comment, so `gqlMagicComment` could never see it. Without extraction, loaders fall back to importing the module, which stays cached under GraphQL Codegen `--watch` and leaves generated types stale.

This release adds `gqlHashComment` (default: `'graphql'`):

- `#graphql` is recognized out of the box
- set `gqlHashComment: 'gql'` (or any other value) for markers like `#gql`
- set `gqlHashComment: ''` to disable hash-comment detection

`/* GraphQL */` via `gqlMagicComment` and the `isGqlTemplateLiteral` / `pluckStringFromFile` hooks keep working as before.
