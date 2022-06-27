---
'@graphql-tools/resolvers': patch
'@graphql-tools/schema': patch
---

New `@graphql-tools/resolvers` package. This package is useful for attaching resolver to the plain non executable schemas created with `buildSchema` of `graphql-js`.
Compared to `addResolversToSchema`, it doesn't run additional heal processes etc because it expects the schema already doesn't have any resolvers.
