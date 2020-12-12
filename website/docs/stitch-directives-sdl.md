---
id: stitch-directives-sdl
title: Directives SDL
sidebar_label: Directives SDL
---

Stitching directives (`@graphql-tools/stitching-directives`) may be used to configure a stitched gateway schema directly through the Schema Definition Language (SDL, also referred to as "type definitions") of its subservices. The advantage of this approach is that all schema _and stitching configuration_ is represented in a single document managed by each subservice, and can be loaded (or reloaded) by the gateway on the fly. These SDL configurations enable hot-reloading of the gateway schema without a formal deployment or server restart.

## Overview

Using SDL directives, a subservice may express its complete schema _and type merging configuration_ in a single document, which may then be pushed to the gateway server to trigger a reload.

```graphql
# --- Users schema ---
type User @key(selectionSet: "{ id }") {
  id: ID!
  username: String!
  email: String!
}

type Query {
  users(ids: [ID!]!): [User]! @merge(keyField: "id")
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
  _users(ids: [ID!]!): [User]! @merge(keyField: "id")
}
```

In the above example, the Users and Posts schemas will be combined in the stitched gateway and provide all of their own merged type configuration. All SDL directives will translate directly into the static configurations discussed in [type merging docs](/docs/stitch-type-merging). See the [recipes](#recipes) section below for some common translations.

## Directives glossary

By default, stitching directives use the following definitions (though the names of these directives [may be customized](#customizing-names)):

```graphql
directive @key(selectionSet: String!) on OBJECT
directive @merge(keyField: String, keyArg: String, key: [String!], argsExpr: String, additionalArgs: String) on FIELD_DEFINITION
directive @computed(selectionSet: String!) on FIELD_DEFINITION
```

The function of these directives are:

* **`@key`:** specifies the base selection set used to merge the annotated type across subschemas. Analogous to the `selectionSet` setting specified in [merged type configuration](/docs/stitch-type-merging#basic-example).

* **`@merge`:** denotes a root field used to merge a type across services. The marked field's name is analogous to the `fieldName` setting in merged type configuration, and the field's arguments and return type provide details used in setting up the merger. Additional arguments may tune the merge behavior:

  * `keyField`: specifies the name of a field to pick off the original object as the key value. Generally matches the field specified in the type-level selection set.
  * `keyArg`: specifies which field argument receives the merge key. This may be omitted for fields with only one argument, thus allowing the argument to be inferred.
  * `key`: tktk
  * `argsExpr`: tktk
  * `additionalArgs`: tktk

* **`@computed`:** specifies a selection of fields required from other services to compute the value of this field. These assitional fields are only selected when the computed field is requested. Analogous to [computed field](/docs/stitch-type-merging#computed-fields) in merged type configuration. Computed field dependencies must be sent into the subservice using an [object key](#object-keys).

#### Customizing names

You may use the `stitchingDirectives` helper to build your own directives type definition and validator that implement your own names. For example, the configuration below creates the resources for `@myKey`, `@myMerge`, and `@myComputed` directives:

```js
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const {
  stitchingDirectivesTypeDefs,
  stitchingDirectivesValidator
} = stitchingDirectives({
  keyDirectiveName: 'myKey',
  mergeDirectiveName: 'myMerge',
  computedDirectiveName: 'myComputed',
});
```

## Schema setup

To setup stitching directives, you'll need to install their definitions into each subschema, and then add a transformer to the stitched gateway that reads them. See the [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/stitching-directives-sdl) for a complete working demonstration.

### Subservice setup

When setting up a subservice, you'll need to do three things:

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

1. Include `stitchingDirectivesTypeDefs` in your schema's type definitions string (these define the schema of the directives themselves).
2. Include a `stitchingDirectivesValidator` in your executable schema (highly recommended).
3. Setup a query field that returns the schema's raw type definitions string (see the `_sdl` field above). This field is extremely important for exposing the annotated SDL to your stitched gateway. Unfortunately, custom directives cannot be obtained through schema introspection.


### Gateway setup

When setting up the stitched gateway, you'll need to do two things:

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

1. Include `stitchingDirectivesTransformer` in your stitched gateway's config transformations. This will read SDL directives into the schema's static configuration.
2. Fetch subschemas going through their `_sdl` query. You _cannot_ introspect custom directives, so you must use a custom query that provides the complete annotated type definitions string.

## Recipes

Describe all the major formulas for using directives...


### Single picked key

Open the Accounts schema and see the expression of a [single-record merge query](../type-merging-single-records):

```graphql
type User @key(selectionSet: "{ id }") {
  id: ID!
  name: String!
  username: String!
}

type Query {
  user(id: ID!): User @merge(keyField: "id")
}
```

This translates into the following configuration:

```js
merge: {
  User: {
    selectionSet: '{ id }'
    fieldName: 'user',
    args: (id) => ({ id }),
  }
}
```

Here the `@key` directive specifies a base selection set for the merged type, and the `@merge(keyField: "id")` directive marks a merger query&mdash;specifying that the `id` field should be picked from the original object as the query argument.

### Picked keys array

Next, open the Products schema and see the expression of an [array-batched merge query](../type-merging-arrays):

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
}

type Query {
  products(upcs: [ID!]!): [Product]! @merge(keyField: "upc")
}
```

This translates into the following configuration:

```js
merge: {
  Product: {
    selectionSet: '{ upc }'
    fieldName: 'products',
    key: ({ upc }) => upc,
    argsFromKeys: (upcs) => ({ upcs }),
  }
}
```

Again, the `@key` directive specifies a base selection set for the merged type, and the `@merge(keyField: "upc")` directive marks a merger array query&mdash;specifying that a `upc` field should be picked from each original object for the query argument array.

### Object keys

Now open the Inventory schema and see the expression of an object key, denoted by the `_Key` scalar. This special scalar builds a typed object like those sent to [federation services](../federation-services):

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
  shippingEstimate: Int @computed(selectionSet: "{ price weight }")
}

scalar _Key

type Query {
  _products(keys: [_Key!]!): [Product]! @merge
}
```

This translates into the following configuration:

```js
// uses lodash-like behavior for picking keys...
const { pick } = require('lodash');

merge: {
  Product: {
    selectionSet: '{ upc }',
    computedFields: {
      shippingEstimate: { selectionSet: '{ price weight }' },
    },
    fieldName: '_products',
    key: (obj) => ({ __typename: 'Product', ...pick(obj, ['upc', 'price', 'weight']) }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

The `_Key` scalar generates an object with a `__typename` and all _utilized_ selectionSet fields on the type. For example, when the `shippingEstimate` field is requested, the resulting object keys look like:

```js
[
  { upc: '1', price: 899, weight: 100, __typename: 'Product' },
  { upc: '2', price: 1299, weight: 1000, __typename: 'Product' }
]
```

However, when `shippingEstimate` is NOT requested, the generated object keys will only contain fields from the base selectionSet and a `__typename`:

```js
[
  { upc: '1', __typename: 'Product' },
  { upc: '2', __typename: 'Product' }
]
```

### Typed inputs

Similar to the [object keys](#object-keys) discussed above, an input object type may be used to constrain the specific fields included on a object key:

```graphql
type User @key(selectionSet: "{ id }") {
  id: ID!
}

input UserKey {
  id: ID!
}

type Query {
  _users(keys: [UserKey!]!): [User]! @merge
}
```

This translates into the following configuration:

```js
merge: {
  User: {
    selectionSet: '{ id }',
    fieldName: '_users',
    key: ({ id }) => ({ id }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

In this case, the generated object keys will contain nothing but utilized selectionSet fields that are whitelisted by the input type:

```js
[
  { id: '1' },
  { id: '2' }
]
```

### Nested inputs

A more advanced form of [typed input keys](#typed-inputs), this pattern uses the `keyArg` parameter to specify an input path at which to format the stitching query arguments:

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
}

input ProductKey {
  upc: ID!
}

input ProductInput {
  keys: [ProductKey!]!
}

type Query {
  _products(input: ProductInput): [Product]! @merge(keyArg: "input.keys")
}
```

## Hot reloading

Talk about hot reloading...
