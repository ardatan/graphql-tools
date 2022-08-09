---
'@graphql-tools/schema': major
---

Thanks @mattkrick and @borisno2!

## Breaking changes

`addResolversToSchema`;

If you are using the legacy parameters like below, you should update them to the new usage. Other than that, there is no functional change;

```ts
// From
addResolversToSchema(schema, resolvers, resolverValidationOptions)

// To
addResolversToSchema({
  schema,
  resolvers,
  resolverValidationOptions
})
```

`mergeSchemas`;

The provided `resolver` overrides the resolvers in the `schema` with the same name;

The `hello` resolver in the `schema` would be overridden by the `hello` resolver in the `resolvers`. Before it was opposite which is not expected.

```ts
const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello world!'
    }
  }
})

mergeSchemas({
  schemas: [schema],
  resolvers: {
    Query: {
      hello: () => 'New hello world'
    }
  }
})
```

`makeExecutableSchema` no longer takes `parseOptions` and you can pass those options directly;

```ts
makeExecutableSchema({
  typeDefs: ``,
  parseOptions: {
    assumeValid: true
  }
})

// After
makeExecutableSchema({
  typeDefs: ``,
  assumeValid: true
})
```

`makeExecutableSchema` no longer does pruning and it doesn't take `pruningOptions` anymore.
You can use `pruneSchema` from `@graphql-tools/utils` if you need.

`extractExtensionsFromSchema` moved from `@graphql-tools/merge` to `@graphql-tools/schema`.
And `travelSchemaPossibleExtensions` has been dropped in favor of `mapSchema`.
