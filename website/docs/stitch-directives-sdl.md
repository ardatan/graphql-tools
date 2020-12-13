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
directive @merge(keyField: String, keyArg: String, additionalArgs: String, key: [String!], argsExpr: String) on FIELD_DEFINITION
directive @computed(selectionSet: String!) on FIELD_DEFINITION
```

The function of these directives are:

* **`@key`:** specifies a base selection set needed to merge the annotated type across subschemas. Analogous to the `selectionSet` setting specified in [merged type configuration](/docs/stitch-type-merging#basic-example).

* **`@merge`:** denotes a root field used to merge a type across services. The marked field's name is analogous to the `fieldName` setting in merged type configuration, while the field's arguments and return types automatically configure applicable type mergers. Additional arguments may tune the merge behavior:

  * `keyField`: specifies the name of a field to pick off of original objects as the key value. Omitting this option yields an object key that includes all selectionSet fields.
  * `keyArg`: specifies which field argument receives the merge key. This may be omitted for fields with only one argument where the key recipient can be inferred.
  * `additionalArgs`: specifies a string of additional keys and values to apply to other arguments, formatted as `name: "value"`.
  * _`key`: advanced use only; builds a custom key._
  * _`argsExpr`: advanced use only; builds a custom args object._

* **`@computed`:** specifies a selection of fields required from other services to compute the value of this field. These assitional fields are only selected when the computed field is requested. Analogous to [computed field](/docs/stitch-type-merging#computed-fields) in merged type configuration. Computed field dependencies must be sent into the subservice using an [object key](#object-keys).

#### Customizing names

You may use the `stitchingDirectives` helper to build your own type definitions and validator with custom names. For example, the configuration below creates the resources for `@myKey`, `@myMerge`, and `@myComputed` directives:

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
3. Setup a query field that returns the schema's raw type definitions string (see the `_sdl` field example above). This field is extremely important for exposing the annotated SDL to your stitched gateway. Unfortunately, custom directives cannot be obtained through schema introspection.


### Gateway setup

When setting up the stitched gateway, you'll need to do two things to bring in [remote schemas](/docs/stitch-combining-schemas#stitching-remote-schemas) properly:

```js
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectivesTransformer } = require('@graphql-tools/stitching-directives')();
const { print, buildSchema } = require('graphql');
const { fetch } = require('cross-fetch');

async function createGatewaySchema() {
  const usersExec = createRemoteExecutor('http://localhost:4001/graphql');
  const postsExec = createRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [{
      schema: await fetchRemoteSchema(usersExec),
      executor: usersExec,
    }, {
      schema: await fetchRemoteSchema(postsExec),
      executor: postsExec,
    }]
  });
}

function createRemoteExecutor(url) {
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
```

1. Fetch subschemas through their `_sdl` query. You _cannot_ introspect custom directives, so you must use a custom query that provides the complete annotated type definitions string.
2. Include the `stitchingDirectivesTransformer` in your stitched gateway's config transforms. This will read SDL directives into the stitched schema's static configuration.

## Recipes

### Single picked key

This pattern configures a [single-record merge query](../type-merging-single-records):

```graphql
type User @key(selectionSet: "{ id }") {
  # ...
}

type Query {
  user(id: ID!): User @merge(keyField: "id")
}
```

This SDL translates into the following merge config:

```js
merge: {
  User: {
    selectionSet: '{ id }'
    fieldName: 'user',
    args: ({ id }) => ({ id }),
  }
}
```

Here the `@key` directive specifies a base selection set for the merged type, and the `@merge` directive marks its merge query&mdash;the `keyField` argument specifies that the `id` field should be picked from the original object as the argument value.

### Picked keys array

This pattern configures an [array-batched merge query](../type-merging-arrays):

```graphql
type User @key(selectionSet: "{ id }") {
  # ...
}

type Query {
  users(ids: [ID!]!): [User]! @merge(keyField: "id")
}
```

This SDL translates into the following merge config:

```js
merge: {
  User: {
    selectionSet: '{ id }'
    fieldName: 'users',
    key: ({ id }) => id,
    argsFromKeys: (ids) => ({ ids }),
  }
}
```

Again, the `@key` directive specifies a base selection set for the merged type, and the `@merge` directive marks its merge query&mdash;the `keyField` argument specifies that the `id` field should be picked from each original object for the argument array.

### Multiple arguments

This pattern configures a merge query that receives multiple arguments:

```graphql
type User @key(selectionSet: "{ id }") {
  # ...
}

type Query {
  users(ids: [ID!]!, scope: String): [User]! @merge(
    keyField: "id",
    keyArg: "ids",
    additionalArgs: """ scope: "all" """
  )
}
```

This SDL translates into the following merge config:

```js
merge: {
  User: {
    selectionSet: '{ id }'
    fieldName: 'users',
    key: ({ id }) => id,
    argsFromKeys: (ids) => ({ ids, scope: 'all' }),
  }
}
```

Because the merge field recieves multiple arguments, the `keyArg` parameter is required to specify which argument recieves the key(s). The `additionalArgs` parameter may then be used to provide static values for the other arguments.

### Object keys

In the absence of a `keyField` to pick, keys will assume the shape of an object with a `__typename` and all fields collected by all selectionSets on the type. These object keys should be represented in your schema with a dedicated scalar type:

```graphql
type Product @key(selectionSet: "{ upc }") {
  # ...
  shippingEstimate: Int @computed(selectionSet: "{ price weight }")
}

scalar _Key

type Query {
  products(keys: [_Key!]!): [Product]! @merge
}
```

This SDL translates into the following merge config:

```js
// assume "pick" works like the lodash method...
merge: {
  Product: {
    selectionSet: '{ upc }',
    computedFields: {
      shippingEstimate: { selectionSet: '{ price weight }' },
    },
    fieldName: 'products',
    key: (obj) => ({ __typename: 'Product', ...pick(obj, ['upc', 'price', 'weight']) }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

Each generated object key will have a `__typename` and all _utilized_ selectionSet fields on the type. For example, when the `shippingEstimate` field is requested, the resulting object keys will look like this:

```js
[
  { __typename: 'Product', upc: '1', price: 899, weight: 100 },
  { __typename: 'Product', upc: '2', price: 1299, weight: 1000 }
]
```

However, when `shippingEstimate` is NOT requested, the generated object keys will only contain fields from the base selectionSet:

```js
[
  { __typename: 'Product', upc: '1' },
  { __typename: 'Product', upc: '2' }
]
```

### Typed inputs

Similar to the [object keys](#object-keys) discussed above, an input object type may be used in place of a generic scalar to cast object keys with a specific schema:

```graphql
type Product @key(selectionSet: "{ upc }") {
  # ...
  shippingEstimate: Int @computed(selectionSet: "{ price weight }")
}

input ProductKey {
  upc: ID!
  price: Int
  weight: Int
}

type Query {
  products(keys: [ProductKey!]!): [Product]! @merge
}
```

This SDL translates into the following merge config:

```js
// assume "pick" works like the lodash method...
merge: {
  Product: {
    selectionSet: '{ upc }',
    computedFields: {
      shippingEstimate: { selectionSet: '{ price weight }' },
    },
    fieldName: 'products',
    key: (obj) => pick(obj, ['upc', 'price', 'weight']),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

These typed inputs follow the same behavior as object keys with regards to only including fields from _utilized_ selectionSets. The resulting objects will only ever include fields whitelisted by their input schema, and are subject to nullability mismatch errors:

```js
[
  { upc: '1', price: 899, weight: 100 },
  { upc: '2', price: 1299, weight: 1000 }
]
```

### Nested inputs

More advanced cases may need to interface with complex inputs. In these cases, the `keyArg` may specify a namespaced path at which to send the merge key:

```graphql
type Product @key(selectionSet: "{ upc }") {
  # ...
}

input ProductKey {
  upc: ID!
}

input ProductInput {
  keys: [ProductKey!]!
}

type Query {
  products(input: ProductInput): [Product]! @merge(keyArg: "input.keys")
}
```

## Versioning

Talk about hot reloading...

## Deployment

Talk about hot reloading...
