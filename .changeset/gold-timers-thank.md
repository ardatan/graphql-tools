---
'@graphql-tools/load': minor
'@graphql-tools/schema': minor
'@graphql-tools/utils': minor
---

`mergeSchemas` was skipping `defaultFieldResolver` and `defaultMergedResolver` by default while extracting resolvers for each given schema to reduce the overhead. But this doesn't work properly if you mix wrapped schemas and local schemas. So new `all` flag is introduced in `getResolversFromSchema` to put default field resolvers in the extracted resolver map for `mergeSchemas`.

This fixes an issue with alias issue, so nested aliased fields weren't resolved properly because of the missing `defaultMergedResolver` in the final merged schema which should come from the wrapped schema.

