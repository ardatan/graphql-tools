---
'graphql-tools': minor
---

Deprecate `graphql-tools` with a more clear message;

This package has been deprecated and now it only exports makeExecutableSchema.
It will no longer receive updates.
We strongly recommend you to migrate to scoped packages such as @graphql-tools/schema, @graphql-tools/utils and etc.
Check out https://www.graphql-tools.com to learn which packages you should use instead!
