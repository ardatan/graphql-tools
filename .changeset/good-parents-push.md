---
'@graphql-tools/delegate': patch
---

Pass operation directives correctly to the subschema;
```graphql
query {
  hello @someDir
}
```
