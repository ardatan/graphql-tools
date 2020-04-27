---
id: schema-loading
title: Loading GraphQL Schemas from different sources
sidebar_label: Schema loading
---

These utils are useful for scanning, loading and building a GraphQL schema from any input.

You can specify a GraphQL endpoint, local introspection JSON file, code file that `export`s a GraphQLSchema, AST string and `.graphql` files (with support for `glob` expression).

All found schema files can be merged into a complete schema. There is support for `#import` syntax (formerly known as [`graphql-import`](https://github.com/ardatan/graphql-import)).

The user is given the option of implementing their own loader (implement the interface `SchemaLoader`).

The schema loading util is using loaders, and implemented using [chain-of-responsibility pattern](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern).

Specifiying the loader is not necessary. The user need only provide the inputs. The utils will detect it automatically.

## Usage

```ts
const { loadSchema } = require('@graphql-tools/load');
const { UrlLoader } = require('@graphql-tools/url-loader');
const { JsonFileLoader } = require('@graphql-tools/json-file-loader');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');

const schema1 = loadSchema('type A { foo: String }');   // load from string w/ no loaders

const schema2 = loadSchema('http://localhost:3000/graphql', {   // load from endpoint
    loaders: [
        new UrlLoader()
    ]
});

const schema3 = loadSchema('./schema.json', {   // load from local json file
    loaders: [
        new JsonFileLoader()
    ]
});

const schema4 = loadSchema('schema.graphql', {  // load from a single schema file
    loaders: [
        new GraphQLFileLoader()
    ]
});

const schema5 = loadSchema('./src/**/*.graphql', { // load from multiple files using glob
    loaders: [
        new GraphQLFileLoader()
    ]
});
```
