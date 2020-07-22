# GraphQL Tools Webpack Loader

A webpack loader to preprocess GraphQL Documents (operations, fragments and SDL)

Slightly different fork of [graphql-tag/loader](https://github.com/apollographql/graphql-tag/pull/304).

    yarn add @graphql-tools/webpack-loader

How is it different from `graphql-tag`? It removes locations entirely, doesn't include sources (string content of imported files), no warnings about duplicated fragment names and supports more custom scenarios.

## Options

- noDescription (_default: false_) - removes descriptions
- esModule (_default: false_) - uses import and export statements instead of CommonJS

## Importing GraphQL files

_To add support for importing `.graphql`/`.gql` files, see [Webpack loading and preprocessing](#webpack-loading-and-preprocessing) below._

Given a file `MyQuery.graphql`

```graphql
query MyQuery {
  ...
}
```

If you have configured [the webpack @graphql-tools/webpack-loader](#webpack-loading-and-preprocessing), you can import modules containing graphQL queries. The imported value will be the pre-built AST.

```typescript
import MyQuery from './query.graphql'
```

### Preprocessing queries and fragments

Preprocessing GraphQL queries and fragments into ASTs at build time can greatly improve load times.

#### Webpack loading and preprocessing

Using the included `@graphql-tools/webpack-loader` it is possible to maintain query logic that is separate from the rest of your application logic. With the loader configured, imported graphQL files will be converted to AST during the webpack build process.

```js
{
  loaders: [
    {
      test: /\.(graphql|gql)$/,
      exclude: /node_modules/,
      loader: '@graphql-tools/webpack-loader',
      options: {
        /* ... */
      }
    }
  ],
}
```
