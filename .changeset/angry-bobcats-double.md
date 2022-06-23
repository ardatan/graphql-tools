---
'@graphql-tools/load': patch
---

No longer call `mergeSchemas` if a single schema is loaded.
Previously all typeDefs and resolvers were extracted and the schema was rebuilt from scratch.
But this is not necessary if there is only one schema loaded with `loadSchema`
