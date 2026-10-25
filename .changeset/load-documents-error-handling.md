---
'@graphql-tools/utils': minor
'@graphql-tools/load': minor
'@graphql-tools/graphql-file-loader': minor
'@graphql-tools/code-file-loader': minor
---

`loadDocuments` / `loadTypedefs` now accept `errorHandling` so a single invalid file does not have to hide the rest of the load.

A glob that mixes a valid operation with broken SDL used to throw the first `Syntax Error` and drop every other file:

```graphql
# valid.query.graphql
query ValidQuery {
  a
}
```

```graphql
# broken-a.query.graphql
query {
  a
```

```ts
await loadDocuments('**/*.query.graphql', {
  loaders: [new GraphQLFileLoader()],
});
// throws Syntax Error
```

`errorHandling` chooses what happens next. The default is unchanged (`throw` the first error).

`aggregate` waits until every source is attempted, then throws `AggregateError` with each parse/load failure:

```ts
await loadDocuments('**/*.query.graphql', {
  loaders: [new GraphQLFileLoader()],
  errorHandling: 'aggregate',
});
```

`return` does not throw. Failed sources stay in the result as `{ location, error }` without a `document`, next to the sources that parsed:

```ts
const sources = await loadDocuments('**/*.query.graphql', {
  loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
  errorHandling: 'return',
});

sources[0].document; // ValidQuery
sources[1].document; // undefined
sources[1].error; // GraphQLError: Syntax Error
```

`Source` now has an optional `error` field. `@graphql-tools/graphql-file-loader` and `@graphql-tools/code-file-loader` honor the same option. `CodeFileLoader`'s existing `noSilentErrors` default is unchanged unless `errorHandling` is set.
