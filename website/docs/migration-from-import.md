---
id: migration-from-import
title: Migration from GraphQL Import
description: Migration from GraphQL Import
---

GraphQL Import was an NPM package that allows you import and export definitions using `#import` syntax in `.graphql` files. So this package has been moved under GraphQL Tools monorepo. It is really easy to migrate. You need two different packages `@graphql-tools/load` and `@graphql-tools/code-file-loader`.

Before;
```ts
import { importSchema } from 'graphql-import';

const typeDefs = importSchema(join(__dirname, 'schema.graphql'));
```

After;
```ts
import { loadSchema } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';

const typeDefs = await loadSchema(join(__dirname, 'schema.graphql'), {
  loaders: [new GraphQLFileLoader()],
});
```

You can learn more about those new packages in [Schema Loading](/docs/schema-loading) section.

