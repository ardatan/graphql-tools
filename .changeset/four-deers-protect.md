---
'@graphql-tools/federation': patch
'@graphql-tools/delegate': patch
---

Handle nested computed fields correctly
If there is a field in a subschema that requires another field that requires another field, add all dependencies to the query plan. This is necessary for computed fields that depend on other computed fields.
