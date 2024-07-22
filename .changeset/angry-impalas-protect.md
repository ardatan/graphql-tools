---
'@graphql-tools/delegate': patch
---

If an abstract type on the gateway resolves to a type that does not exist on the gateway, return
null instead of showing an error to the user
