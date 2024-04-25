---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

If one of the subgraphs are already able to resolve a nested field as in `parent-entity-call` example's `Category.details` from C's `Product`, resolve it from there instead of using type merging.

```graphql
  query {
    product {
      category {
        details { # This is coming from C's Product, so resolve it from there instead of Type Merging
          id
          name
        }
      }
    }
  }
```
