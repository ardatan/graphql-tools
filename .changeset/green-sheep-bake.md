---
"@graphql-tools/stitch": patch
---

Add field as an unavailable field only if it is not able to resolve by any other subschema;

When the following query is sent to the gateway with the following subschemas, the gateway should resolve `Category.details` from A Subschema using `Product` resolver instead of trying to resolve by using non-existing `Category` resolver from A Subschema.

So for the following query, we expect a full result;
```graphql
    query {
      productFromA(id: "1") {
        id
        name
        category {
          id
          name
          details
        }
      }
    }
```


```graphql
# A Subschema
type Query {
  productFromA(id: ID): Product
  # No category resolver is present
}

type Product {
  id: ID
  category: Category
}

type Category {
  details: CategoryDetails
}
```

```graphql
# B Subschema
type Query {
  productFromB(id: ID): Product
}
type Product {
  id: ID
  name: String
  category: Category
}
type Category {
  id: ID
}
```

```graphql
# C Subschema
type Query {
  categoryFromC(id: ID): Category
}

type Category {
  id: ID
  name: String
}
```
