---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

Allows `MergedTypeConfig` to be written with an `entryPoints` array for multiple merged type entry points, each with their own `fieldName` and `selectionSet`:

```js
{
  schema: testSchema,
  merge: {
    Product: {
      entryPoints: [{
        selectionSet: '{ id }',
        fieldName: 'productById',
        key: ({ id, price, weight }) => ({ id, price, weight }),
        argsFromKeys: (key) => ({ key }),
      }, {
        selectionSet: '{ upc }',
        fieldName: 'productByUpc',
        key: ({ upc, price, weight }) => ({ upc, price, weight }),
        argsFromKeys: (key) => ({ key }),
      }],
    }
  }
}
```

These multiple entry points accommodate types with multiple keys across services that rely on a central service to join them, for example:

- Catalog service: `type Product { upc }`
- Vendors service: `type Product { upc id }`
- Reviews service: `type Product { id }`

Given this graph, the possible traversals require the Vendors service to provide entry points for each unique key format:

- `Catalog > Vendors > Reviews`
- `Catalog < Vendors > Reviews`
- `Catalog < Vendors < Reviews`

Is it highly recommended that you enable query batching for subschemas with multiple entry points.
