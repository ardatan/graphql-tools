---
id: stitch-directives-sdl
title: Directives SDL
sidebar_label: Directives SDL
---

Stitching directives (@graphql-tools/stitching-directives) may be used to configure a stitched schema directly through its schema definition language (SDL), or type definition string. The advantage of this approach is that all schema _and stitching configuration_ is represented in a single document managed by each subservice, and can be loaded (or reloaded) by the gateway as needed. These SDL configurations enable hot-reloading of the gateway schema without a formal deployment or server restart.

## Overview

Give a quick overview of what we're doing here and what this looks like...

```graphql
# --- Users schema ---
type User @key(selectionSet: "{ id }") {
  id: ID!
  username: String!
  email: String!
}

type Query {
  users(ids: [ID!]!): [User]! @merge
}

# --- Posts schema ---
type Post {
  id: ID!
  message: String!
  author: User
}

type User @key(selectionSet: "{ id }") {
  id: ID!
  posts: [Post]
}

type Query {
  post(id: ID!): Post
  _users(ids: [ID!]!): [User]! @merge
}
```

In the above example...

## Schema setup

Discuss setting up a stitched SDL...

### Subservice setup

Need an SDL query and to add the proper transforms, go...

```js
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');

const {
  stitchingDirectivesTypeDefs,
  stitchingDirectivesValidator
} = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  # schema here ...
  type Query {
    # schema here ...
    _sdl: String!
  }
`;

module.exports = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Query: {
      _sdl: () => typeDefs
    }
  }
});
```

### Gateway setup

Then fetch the SDL using your executor, also with proper transforms...

```js
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectivesTransformer } = require('@graphql-tools/stitching-directives')();
const { print, buildSchema } = require('graphql');
const { fetch } = require('cross-fetch');

function makeRemoteExecutor(url) {
  return async ({ document, variables }) => {
    const query = typeof document === 'string' ? document : print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
}

async function fetchRemoteSchema(executor) {
  const result = await executor({ document: '{ _sdl }' });
  return buildSchema(result.data._sdl);
}

async function createGatewaySchema() {
  const executor1 = makeRemoteExecutor('http://localhost:4001/graphql');
  const executor2 = makeRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [{
      schema: await fetchRemoteSchema(executor1),
      executor: executor1,
    }, {
      schema: await fetchRemoteSchema(executor2),
      executor: executor2,
    }]
  });
}
```

## Directives glossary

By default, Stitching directives use the following definitions (though the names of these directives may be customized):

```graphql
directive @key(selectionSet: String!) on OBJECT
directive @merge(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION
directive @computed(selectionSet: String!) on FIELD_DEFINITION
```

The function of these directives are:

* `@key`: provides the base selection set used to merge a type shared across schemas. This is analogous to the `selectionSet` setting in merged type configuration.
  * `selectionSet`: blah blah

* `@merge`: indicates a query that provides merging services for a type. The marked field's name is analogous to the `fieldName` setting in merged type configuration, and the field's signature provides details about the service's type and argument mappings.
  * `argsExpr`: blah blah
  * `keyArg`: blah blah
  * `keyField`: blah blah
  * `key`: blah blah
  * `additionalArgs`: blah blah

* `@computed`: denotes a [computed field](/docs/stitch-type-merging#computed-fields) that requires data from other subschemas to compute its value.
  * `selectionSet`: blah blah

### Custom names

You may also customize the names of your directives...

```js
const {
  stitchingDirectivesTypeDefs,
  stitchingDirectivesValidator
} = stitchingDirectives({
  keyDirectiveName: 'myKey',
  computedDirectiveName: 'myComputed',
  mergeDirectiveName: 'myMerge',
});
```

## Recipes

Describe all the major formulas for using directives...

## Hot reloading

Talk about hot reloading...
