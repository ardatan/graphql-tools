---
id: merge-schemas
title: GraphQLSchema merging
sidebar_label: GraphQLSchema merging
---

```TODO: Add differences between merging and stitching```

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
