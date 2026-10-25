---
'@graphql-tools/load': minor
---

Custom loaders on `loadDocuments` / `loadDocumentsSync` / `loadSchema` can now return an array. Each item is added as its own source.

A pointer such as `src/**/*.{ts,tsx}` calls the custom loader once. Returning a single combined document kept every operation on that one pointer. Returning an array was ignored, so the load failed with `Couldn't find any GraphQL type definitions`.

```js
// custom-loader.js
const { parse } = require('graphql');

module.exports = function () {
  return [
    {
      document: parse(/* GraphQL */ `
        query Users {
          users {
            id
          }
        }
      `),
      location: 'users.graphql',
    },
    {
      document: parse(/* GraphQL */ `
        query Orders {
          orders {
            id
          }
        }
      `),
      location: 'orders.graphql',
    },
  ];
};
```

```ts
loadDocuments(
  {
    'src/**/*.{ts,tsx}': {
      loader: './custom-loader.js',
    },
  },
  { loaders: [] },
);
```

The result is two sources: `Users` at `users.graphql` and `Orders` at `orders.graphql`. A single `DocumentNode` or `{ document }` return value still becomes one source. An array of `DocumentNode`s uses the pointer as each item's location.
