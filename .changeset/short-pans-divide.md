---
'@graphql-tools/delegate': patch
---

If an enum value coming from the subschema is not available on gateway, do not show an error to the
user but return null instead
