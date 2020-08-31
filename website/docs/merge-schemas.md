---
id: merge-schemas
title: GraphQLSchema merging
sidebar_label: GraphQLSchema merging
---

You can use `mergeSchemas` to merge `GraphQLSchema` objects together with extra `typeDefs` and `resolvers`.

```ts
const { mergeSchemas } = require('@graphql-tools/merge');

const mergedSchema = mergeSchemas({
    schemas: [
        BarSchema,
        BazSchema,
    ],
    typeDefs: `
        type ExtraType {
            foo: String
        }
    `,
    resolvers: {
        ExtraType: {
            foo: () => 'FOO',
        }
    }
});
```

> There is also `mergeSchemasAsync` as a faster asynchronous alternative.

### Difference between merging and stitching

[Schema Stitching](/docs/stitch-combining-schemas) creates a gateway/proxy schema on top of different independent subschemas so the parts of that schema are executed using GraphQLJS internally. This is useful to create an architecture like microservices.

Schema Merging creates a new schema by merging the extracted type definitions and resolvers from them so there will be a single execution layer.

The first one keeps the individual schemas but the second one doesn't. So the first one is good for combining multiple remote GraphQL APIs but the second one is good for combining local schemas.
