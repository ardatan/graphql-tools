---
id: stitch-directives-sdl
title: Directives SDL
sidebar_label: Directives SDL
---

Stitching directives (`@graphql-tools/stitching-directives`) may be used to configure a stitched gateway directly through the Schema Definition Language (SDL) of its subservices. The advantage of this approach is that all schema _and type merging configuration_ is represented in a single document managed by each subservice, and can be reloaded by the gateway on the fly without a formal deploy or server restart.

## Overview

Using SDL directives, a subservice may express its complete schema _and type merging configuration_ in a single document. See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/stitching-directives-sdl) for a working demonstration.

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

In the above example, the Users and Posts schemas will be combined in the stitched gateway and provide all of their own merged type configuration. All SDL directives will translate directly into the static configurations discussed in [type merging docs](/docs/stitch-type-merging). See the [recipes](#recipes) section below for some common patterns.

## Directives glossary

By default, stitching directives use the following definitions (though the names of these directives [may be customized](#customizing-names)):

```graphql
directive @key(selectionSet: String!) on OBJECT
directive @merge(keyField: String, keyArg: String, additionalArgs: String, key: [String!], argsExpr: String) on FIELD_DEFINITION
directive @computed(selectionSet: String!) on FIELD_DEFINITION
```

The function of these directives are:

* **`@key`:** specifies a base selection set needed to merge the annotated type across subschemas. Analogous to the `selectionSet` setting specified in [merged type configuration](/docs/stitch-type-merging#basic-example).

* **`@merge`:** denotes a root field used to query a merged type across services. The marked field's name is analogous to the `fieldName` setting in [merged type configuration](/docs/stitch-type-merging#basic-example), while the field's arguments and return types automatically configure merging. Additional arguments may tune the merge behavior (see [example recipes](#recipes)):

  * `keyField`: specifies the name of a field to pick off origin objects as the key value. Omitting this option yields an [object key](#object-keys) that includes all selectionSet fields.
  * `keyArg`: specifies which field argument receives the merge key. This may be omitted for fields with only one argument where the key recipient can be inferred.
  * `additionalArgs`: specifies a string of additional keys and values to apply to other arguments, formatted as `name: "value"`.
  * _`key`: advanced use only; builds a custom key._
  * _`argsExpr`: advanced use only; builds a custom args object._

* **`@computed`:** specifies a selection of fields required from other services to compute the value of this field. These additional fields are only selected when the computed field is requested. Analogous to [computed field](/docs/stitch-type-merging#computed-fields) in merged type configuration. Computed field dependencies must be sent into the subservice using an [object key](#object-keys).

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

To setup stitching directives, you'll need to install their definitions into each subschema, and then add a transformer to the stitched gateway that reads them. See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/stitching-directives-sdl) for a complete demonstration.

### Subservice setup

When setting up a subservice, you'll need to do three things:

```js
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const {
  stitchingDirectivesTypeDefs,
  stitchingDirectivesValidator
} = stitchingDirectives();

// 1. include directive type definitions...
const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  # schema here ...
  type Query {
    # schema here ...
    _sdl: String!
  }
`;

module.exports = makeExecutableSchema({
  // 2. include the stitching directives validator...
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Query: {
      // 3. setup a query that exposes the raw SDL...
      _sdl: () => typeDefs
    }
  }
});
```

1. Include `stitchingDirectivesTypeDefs` in your schema's type definitions string (these define the schema of the directives themselves).
2. Include a `stitchingDirectivesValidator` in your executable schema (highly recommended).
3. Setup a query field that returns the schema's raw type definitions string (see the `_sdl` field example above). This field is extremely important for exposing the annotated SDL to your stitched gateway. Unfortunately, custom directives cannot be obtained through schema introspection.

### Gateway setup

When setting up the stitched gateway, you'll need to do two things:

```js
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectivesTransformer } = require('@graphql-tools/stitching-directives')();
const { print, buildSchema } = require('graphql');
const { fetch } = require('cross-fetch');

async function createGatewaySchema() {
  const usersExec = createRemoteExecutor('http://localhost:4001/graphql');
  const postsExec = createRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    // 1. include directives transformer...
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
  // 2. fetch schemas from their raw SDL queries...
  const result = await executor({ document: '{ _sdl }' });
  return buildSchema(result.data._sdl);
}
```
1. Include the `stitchingDirectivesTransformer` in your stitched gateway's config transforms. This will read SDL directives into the stitched schema's static configuration.
2. Fetch subschemas through their `_sdl` query. You _cannot_ introspect custom directives, so you must use a custom query that provides the complete annotated type definitions string.

## Recipes

### Picked keys

The simplest merge pattern picks a key field from origin objects:

```graphql
type User @key(selectionSet: "{ id }") {
  # ...
}

type Product @key(selectionSet: "{ upc }") {
  # ...
}

type Query {
  user(id: ID!): User @merge(keyField: "id")
  products(upcs: [ID!]!): [Product]! @merge(keyField: "upc")
}
```

This SDL translates into the following merge config:

```js
merge: {
  User: {
    // single-record query:
    selectionSet: '{ id }'
    fieldName: 'user',
    args: ({ id }) => ({ id }),
  },
  Product: {
    // array query:
    selectionSet: '{ upc }'
    fieldName: 'products',
    key: ({ upc }) => upc,
    argsFromKeys: (upcs) => ({ upcs }),
  }
}
```

Here the `@key` directive specifies a base selection set for each merged type, and the `@merge` directive marks each type's merge query&mdash;then `keyField` specifies a field to be picked from each original object as the query argument value.

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

In the absence of a `keyField` to pick, keys will assume the shape of an object with a `__typename` and all fields collected for all selectionSets on the type. These object keys may be represented in your schema with a dedicated scalar type, or as an [input object](#typed-inputs):

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

You may use any name for the key scalar, here we're calling it `_Key`. This SDL translates into the following merge config:

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

## Versioning &amp; release

Once all schemas and their merge configurations are defined together as annotated SDL documents, new versions of these documents can be pushed up to the gateway to trigger a "hot" reload&mdash;or, a reload of the gateway schema with server deployment and a restart. See related [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/hot-schema-reloading) demonstrating a basic reload.

However, pushing new SDL versions directly to the gateway is a risky proposition given the potential for incompatible subschema versions to be mixed. Therefore, a formal versioning, testing, and release strategy is necessary for long-term stability. The general process is as follows:

1. Subservice schemas are comitted to a central schema registry where they are all versioned together.
2. Continuous integration tests run on the latest versions of all subservice schemas composed together _before_ any schemas are released.
3. Once a composed release of new subschemas passes integration tests, their underlying subservices are deployed.
4. New subservices should quietly activate new schemas behind the gateway proxy layer without breaking any existing schemas. Breaking changes should always be rolled out during a maintenance window.
5. After all new subservices have been rolled out, the revised schemas may be activated within the gateway proxy layer.

While that process sounds fairly involved (in many ways, it is), you can tune your workflow to naturally build around this process. See our [handbook example](https://github.com/gmac/schema-stitching-handbook/tree/master/versioning-schema-releases) that demonstrates using the GitHub API to turn a basic repo into a schema registry in charge of versioning and releases.