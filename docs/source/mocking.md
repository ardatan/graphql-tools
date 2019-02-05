---
title: Mocking
description: Mock your GraphQL data based on a schema.
---

The strongly-typed nature of a GraphQL API lends itself extremely well to mocking. This is an important part of a GraphQL-First development process, because it enables frontend developers to build out UI components and features without having to wait for a backend implementation.

Even with a backend that is already built, mocking allows you to test your UI without waiting on slow database requests or building out a component harness with a tool like React Storybook.

## Default mock example

Let's take a look at how we can mock a GraphQL schema with just one line of code, using the default mocking logic you get out of the box with `graphql-tools`.

[See a complete runnable example on Launchpad.](https://launchpad.graphql.com/98lq7vz8r)

To start, let's grab the schema definition string from the `makeExecutableSchema` example [in the "Generating a schema" article](./generate-schema.html#example).

```js
import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools';
import { graphql } from 'graphql';

// Fill this in with the schema string
const schemaString = `...`;

// Make a GraphQL schema with no resolvers
const schema = makeExecutableSchema({ typeDefs: schemaString });

// Add mocks, modifies schema in place
addMockFunctionsToSchema({ schema });

const query = `
query tasksForUser {
  user(id: 6) { id, name }
}
`;

graphql(schema, query).then((result) => console.log('Got result', result));
```

> Note: If your schema has custom scalar types, you still need to define the `__serialize`, `__parseValue`, and `__parseLiteral` functions, and pass them inside the second argument to `makeExecutableSchema`.

This mocking logic simply looks at your schema and makes sure to return a string where your schema has a string, a number for a number, etc. So you can already get the right shape of result. But if you want to use the mocks to do sophisticated testing, you will likely want to customize them to your particular data model.

## Customizing mocks

This is where the `mocks` option comes in, it's an object that describes your desired mocking logic. This is similar to the `resolverMap` in `makeExecutableSchema`, but has a few extra features aimed at mocking.

It allows you to specify functions that are called for specific types in the schema, for example:

```js
{
  Int: () => 6,
  Float: () => 22.1,
  String: () => 'Hello',
}
```

You can also use this to describe object types, and the fields can be functions too:

```js
{
  Person: () => ({
    name: casual.name,
    age: () => casual.integer(0, 120),
  }),
}
```

In this example, we are using [casual](https://github.com/boo1ean/casual), a fake data generator for JavaScript, so that we can get a different result every time the field is called. You might want to use a collection of fake objects, or a generator that always uses a consistent seed, if you are planning to use the data for testing.

### Using MockList in resolvers

You can also use the MockList constructor to automate mocking a list:

```js
{
  Person: () => ({
    // a list of length between 2 and 6 (inclusive)
    friends: () => new MockList([2,6]),
    // a list of three lists of two items: [[1, 1], [2, 2], [3, 3]]
    listOfLists: () => new MockList(3, () => new MockList(2)),
  }),
}
```

In more complex schemas, MockList is helpful for randomizing the number of entries returned in lists.

For example, this schema:

```graphql
type Usage {
  account: String!
  summary: [Summary]!
}

type Summary {
  date: String!
  cost: Float!
}
```

By default, the `summary` field will always return 2 entries. To change this, we can add a mock resolver with MockList as follows:

```js
{
  Person: () =>({
    summary: () => new MockList([0, 12]),
  }),
}
```

Now the mock data will contain between zero and 12 summary entries.

### Accessing arguments in mock resolvers

Since the mock functions on fields are actually just GraphQL resolvers, you can use arguments and context in them as well:

```js
{
  Person: () => ({
    // the number of friends in the list now depends on numPages
    paginatedFriends: (root, { numPages }) => new MockList(numPages * PAGE_SIZE),
  }),
}
```

You can read some background and flavor on this approach in our blog post, ["Mocking your server with one line of code"](https://medium.com/apollo-stack/mocking-your-server-with-just-one-line-of-code-692feda6e9cd).

## Mocking interfaces

You will need resolvers to mock interfaces. By default [`addMockFunctionsToSchema`](#addMockFunctionsToSchema) will overwrite resolver functions.
By setting the property `preserveResolvers` on the options object to `true`, the type resolvers will be preserved.

```js
import {
  makeExecutableSchema,
  addMockFunctionsToSchema
} from 'graphql-tools'
import mocks from './mocks' // your mock functions

const typeDefs = `
type Query {
  fetchMore(listType: String!, amount: Int!, offset: Int!): List
}

type Distributor {
  id: Int
  name: String
}

type Product {
  id: Int
  name: String
}

interface List {
  amount: Int
  offset: Int
  total: Int
  remaining: Int
}

type DistributorList implements List {
  amount: Int
  offset: Int
  total: Int
  remaining: Int
  items: [Distributor]
}

type ProductList implements List {
  amount: Int
  offset: Int
  total: Int
  remaining: Int
  items: [Product]
}
`

const typeResolvers = {
  List: {
    __resolveType(data) {
      return data.typename // typename property must be set by your mock functions
    }
  }
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: typeResolvers
})

addMockFunctionsToSchema({
    schema,
    mocks,
    preserveResolvers: true
})
```

## Mocking a schema using introspection

The GraphQL specification allows clients to introspect the schema with a [special set of types and fields](https://facebook.github.io/graphql/#sec-Introspection) that every schema must include. The results of a [standard introspection query](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js) can be used to generate an instance of GraphQLSchema which can be mocked as explained above.

This helps when you need to mock a schema defined in a language other than JS, for example Go, Ruby, or Python.

To convert an [introspection query](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js) result to a `GraphQLSchema` object, you can use the `buildClientSchema` utility from the `graphql` package.

```js
import { buildClientSchema } from 'graphql';
import * as introspectionResult from 'schema.json';

const schema = buildClientSchema(introspectionResult);

addMockFunctionsToSchema({schema});
```

## API

### addMockFunctionsToSchema

```js
import { addMockFunctionsToSchema } from 'graphql-tools';

addMockFunctionsToSchema({
  schema,
  mocks: {},
  preserveResolvers: false,
});
```

Given an instance of GraphQLSchema and a mock object, `addMockFunctionsToSchema` modifies the schema in place to return mock data for any valid query that is sent to the server. If `mocks` is not passed, the defaults will be used for each of the scalar types. If `preserveResolvers` is set to `true`, existing resolve functions will not be overwritten to provide mock data. This can be used to mock some parts of the server and not others.

### MockList

```js
import { MockList } from 'graphql-tools';

new MockList(length: number | number[], mockFunction: Function);
```

This is an object you can return from your mock resolvers which calls the `mockFunction` once for each list item. The first argument can either be an exact length, or an inclusive range of possible lengths for the list, in case you want to see how your UI responds to varying lists of data.

### mockServer

```js
import { mockServer } from 'graphql-tools';

// This can be an SDL schema string (eg the result of `buildClientSchema` above)
// or a GraphQLSchema object (eg the result of `buildSchema` from `graphql`)
const schema = `...`

// Same mocks object that `addMockFunctionsToSchema` takes above
const mocks = {}
preserveResolvers = false

const server = mockServer(schemaString, mocks, preserveResolvers);

const query = `{ __typename }`
const variables = {}

server.query(query, variables)
  .then(response => {
    console.log(response)
  })
```

`mockServer` is just a convenience wrapper on top of `addMockFunctionsToSchema`. It adds your mock resolvers to your schema and returns a client that will correctly execute
your query with variables. **Note**: when executing queries from the returned server,
`context` and `root` will both equal `{}`.
