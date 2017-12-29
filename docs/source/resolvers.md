---
title: Resolvers
description: Writing resolvers with graphql-tools
---

When using `graphql-tools`, you define your field resolvers separately from the schema. Since the schema already describes all of the fields, arguments, and result types, the only thing left is a collection of functions that are called to actually execute these fields.

Keep in mind that GraphQL resolvers can return [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). In fact, most resolvers that do real work - for example fetching data from a database or a REST API - will return a promise. If you’re not familiar with promises, here’s [a brief overview](https://scotch.io/tutorials/javascript-promises-for-dummies).


## Resolver map

In order to respond to queries, a schema needs to have resolve functions for all fields. Resolve functions cannot be included in the GraphQL schema language, so they must be added separately. This collection of functions is called the "resolver map".

The `resolverMap` object should have a map of resolvers for each relevant GraphQL Object Type. The following is an example of a valid `resolverMap` object:

```js
const resolverMap = {
  Query: {
    author(obj, args, context, info) {
      return find(authors, { id: args.id });
    },
  },
  Author: {
    posts(author) {
      return filter(posts, { authorId: author.id });
    },
  },
};
```
> Note: If you are using mocking, the `preserveResolvers` argument of [`addMockFunctionsToSchema`](docs/graphql-tools/mocking.html#addMockFunctionsToSchema) must be set to `true` if you don't want your resolvers to be overwritten by mock resolvers.

Note that you don't have to put all of your resolvers in one object. Refer to the ["modularizing the schema"](/docs/graphql-tools/generate-schema.html#modularizing) section to learn how to combine multiple resolver maps into one.

## Resolver function signature

Every resolver in a GraphQL.js schema accepts four positional arguments:

```js
fieldName(obj, args, context, info) { result }
```

These arguments have the following meanings and conventional names:

1. `obj`: The object that contains the result returned from the resolver on the parent field, or, in the case of a top-level `Query` field, the `rootValue` passed from the [server configuration](/tools/apollo-server/setup.html). This argument enables the nested nature of GraphQL queries.
2. `args`: An object with the arguments passed into the field in the query. For example, if the field was called with `author(name: "Ada")`, the `args` object would be: `{ "name": "Ada" }`.
3. `context`: This is an object shared by all resolvers in a particular query, and is used to contain per-request state, including authentication information, dataloader instances, and anything else that should be taken into account when resolving the query. If you're using Apollo Server, [read about how to set the context in the setup documentation](/tools/apollo-server/setup.html).
4. `info`: This argument should only be used in advanced cases, but it contains information about the execution state of the query, including the field name, path to the field from the root, and more. It's only documented in the [GraphQL.js source code](https://github.com/graphql/graphql-js/blob/c82ff68f52722c20f10da69c9e50a030a1f218ae/src/type/definition.js#L489-L500).

### Resolver result format

Resolvers in GraphQL can return different kinds of results which are treated differently:

1. `null` or `undefined` - this indicates the object could not be found. If your schema says that field is _nullable_, then the result will have a `null` value at that position. If the field is `non-null`, the result will "bubble up" to the nearest nullable field and that result will be set to `null`. This is to ensure that the API consumer never gets a `null` value when they were expecting a result.
2. An array - this is only valid if the schema indicates that the result of a field should be a list. The sub-selection of the query will run once for every item in this array.
3. A promise - resolvers often do asynchronous actions like fetching from a database or backend API, so they can return promises. This can be combined with arrays, so a resolver can return a promise that resolves to an array, or an array of promises, and both are handled correctly.
4. A scalar or object value - a resolver can also return any other kind of value, which doesn't have any special meaning but is simply passed down into any nested resolvers, as described in the next section.

### Resolver obj argument

The first argument to every resolver, `obj`, can be a bit confusing at first, but it makes sense when you consider what a GraphQL query looks like:

```graphql
query {
  getAuthor(id: 5){
    name
    posts {
      title
      author {
        name # this will be the same as the name above
      }
    }
  }
}
```

You can think of every GraphQL query as a tree of function calls, as explained in detail in the [GraphQL explained blog post](https://dev-blog.apollodata.com/graphql-explained-5844742f195e#.fq5jjdw7t). So the `obj` contains the result of parent resolver, in this case:

1. `obj` in `Query.getAuthor` will be whatever the server configuration passed for `rootValue`.
2. `obj` in `Author.name` and `Author.posts` will be the result from `getAuthor`, likely an Author object from the backend.
3. `obj` in `Post.title` and `Post.author` will be one item from the `posts` result array.
4. `obj` in `Author.name` is the result from the above `Post.author` call.

Basically, it's just every resolver function being called in a nested way according to the layout of the query.

### Default resolver

You don't need to specify resolvers for _every_ type in your schema. If you don't specify a resolver, GraphQL.js falls back to a default one, which does the following:

1. Returns a property from `obj` with the relevant field name, or
2. Calls a function on `obj` with the relevant field name and passes the query arguments into that function

So, in the example query above, the `name` and `title` fields wouldn't need a resolver if the Post and Author objects retrieved from the backend already had those fields.

## Unions and interfaces

Unions and interfaces are great when you have fields that are in common between two types.

When you have a field in your schema that returns a union or interface type, you will need to specify an extra `__resolveType` field in your resolver map, which tells the GraphQL executor which type the result is, out of the available options.

For example, if you have a `Vehicle` interface type with members `Airplane` and `Car`:

You could specify the schema like so

```
interface Vehicle {
  maxSpeed: Int
}

type Airplane implements Vehicle {
  maxSpeed: Int
  wingspan: Int
}

type Car implements Vehicle {
  maxSpeed: Int
  licensePlate: String
}
```

```js
const resolverMap = {
  Vehicle: {
    __resolveType(obj, context, info){
      if(obj.wingspan){
        return 'Airplane';
      }

      if(obj.licensePlate){
        return 'Car';
      }

      return null;
    },
  },
};
```

> Note: Returning the type name as a string from `__resolveType` is only supported starting with GraphQL.js 0.7.2. In previous versions, you had to get a reference using `info.schema.getType('Car')`.

## API

In addition to using a resolver map with `makeExecutableSchema`, you can use it with any GraphQL.js schema by importing the following function from `graphql-tools`:

<h3 id="addResolveFunctionsToSchema" title="addResolveFunctionsToSchema">
  addResolveFunctionsToSchema(schema, resolverMap)
</h3>

`addResolveFunctionsToSchema` takes two arguments, a GraphQLSchema and a resolver map, and modifies the schema in place by attaching the resolvers to the relevant types.

```js
import { addResolveFunctionsToSchema } from 'graphql-tools';

const resolverMap = {
  RootQuery: {
    author(obj, { name }, context){
      console.log("RootQuery called with context " +
        context + " to find " + name);
      return Author.find({ name });
    },
  },
};

addResolveFunctionsToSchema(schema, resolverMap);
```

<h3 id="addSchemaLevelResolveFunction" title="addSchemaLevelResolveFunction">
  addSchemaLevelResolveFunction(schema, rootResolveFunction)
</h3>

Some operations, such as authentication, need to be done only once per query. Logically, these operations belong in an obj resolve function, but unfortunately GraphQL-JS does not let you define one. `addSchemaLevelResolveFunction` solves this by modifying the GraphQLSchema that is passed as the first argument.

<h2 id="companion-tools" title="Companion tools">Companion tools</h2>

Modules and extensions built by the community.

### [graphql-resolvers](https://github.com/lucasconstantino/graphql-resolvers)

Composition library for GraphQL, with helpers to combine multiple resolvers into one, specify dependencies between fields, and more.

When developing a GraphQL server, it is common to perform some authorization logic on your resolvers, usually based on the context of a request. With `graphql-resolvers` you can easily accomplish that and still make the code decoupled - thus testable - by combining multiple single-logic resolvers into one.

The following is an example of a simple logged-in authorization logic:

```js
const isAuthenticated = (root, args, context, info) => {
  if (!context.user) {
    return new Error('Not authenticated')
  }
}
```

Which could be used it in an actual field resolver like this:

```js
import { combineResolvers } from 'graphql-resolvers'

const protectedField = (root, args, context, info) => 'Protected field value'

const resolverMap = {
  Query: {
    protectedField: combineResolvers(
      isAuthenticated,
      protectedField
    )
  }
}
```

> Have a project which improves resolvers development? Send us a [pull request](https://github.com/apollographql/graphql-tools/blob/master/CONTRIBUTING.md)!
