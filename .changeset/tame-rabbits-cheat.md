---
'@graphql-tools/federation': patch
---

Merge the elements of the lists if the root field is shared across different subgraphs

```graphql
type Query {
  products: [Product] # If this field is returned by multiple subgraphs, the elements of the lists will be merged
}
```
