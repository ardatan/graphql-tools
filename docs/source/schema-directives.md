---
title: Schema directives
description: Implementing and using custom `@directive`s that transform schema types, fields, and arguments
---

## GraphQL schema directives

A _directive_ is an identifier preceded by a `@` character, optionally followed by a list of named arguments, which can appear after almost any form of syntax in the GraphQL query or schema languages.

The [GraphQL specification](http://facebook.github.io/graphql/October2016/#sec-Type-System.Directives) requires every server implementation to support at least two directives, `@skip(if: Boolean)` and `@include(if: Boolean)`, which can be used during query execution to conditionally omit or include certain fields. The [GraphQL.js reference implementation](https://github.com/graphql/graphql-js) provides one additional built-in [`@deprecated`](https://github.com/graphql/graphql-js/blob/master/src/type/directives.js) directive, which is useful for indicating that a field or `enum` value should no longer be used.

However, the formal syntax of the GraphQL query and schema languages allows arbitrary user-defined `@directive`s to appear as modifiers following almost any kind of type, field, or argument. Unless the server ascribes special meaning to these annotations, they are typically ignored after parsing, almost as if they were comments. But if the server knows how to interpret them, `@directive` annotations can be a powerful tool for preventing repetition, specifying extra behavior, enforcing additional type or value restrictions, and enabling static analysis.

This document focuses on `@directive`s that appear in GraphQL _schemas_ written in Schema Definition Language (SDL), as described in the [Schemas and Types](http://graphql.org/learn/schema/) section of the GraphQL.org documentation. These `@directive`s can be used to modify the structure and behavior of a GraphQL schema in ways that would not be possible using SDL syntax alone.

In order for a `@directive` to have any consequences, the GraphQL server must be configured to apply a specific implementation of that `@directive` to the `GraphQLSchema` object. This document describes one possible approach to defining reusable `@directive` implementations, namely the `SchemaDirectiveVisitor` abstraction provided by the `graphql-tools` npm package.

The possible applications of `@directive` syntax are numerous: enforcing access permissions, formatting date strings, auto-generating resolver functions for a particular backend API, marking strings for internationalization, synthesizing globally unique object identifiers, specifying caching behavior, skipping or including or deprecating fields, and just about anything else you can imagine.

## Simple Directive example

Let's take a look at how we can create `@upper` Directive to upper-case a string returned from resolve on Field
[See a complete runnable example on Launchpad.](https://launchpad.graphql.com/p00rw37qx0)

To start, let's grab the schema definition string from the `makeExecutableSchema` example [in the "Generating a schema" article](/tools/graphql-tools/generate-schema.html#example).

```js
import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';

// Construct a schema, using GraphQL schema language
const typeDefs = `
  directive @upper on FIELD_DEFINITION

  type Query {
    hello: String @upper
  }
`;

// Implement resolvers for out custom Directive
const directiveResolvers = {
  upper(
    next,
    src,
    args,
    context,
  ) {
    return next().then((str) => {
      if (typeof(str) === 'string') {
        return str.toUpperCase();
      }
      return str;
    });
  },
}

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (root, args, context) => {
      return 'Hello world!';
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers,
});

const query = `
query UPPER_HELLO {
  hello
}
`;

graphql(schema, query).then((result) => console.log('Got result', result));
```

> Note: next() always return a Promise for consistency, resolved with original resolver value or rejected with an error.

## Multi-Directives example

Multi-Directives on a field will be apply with LTR order.
[See a complete runnable example on Launchpad.](https://launchpad.graphql.com/nx945rq1x7)

```js
// graphql-tools combines a schema string with resolvers.
import { makeExecutableSchema } from 'graphql-tools';

// Construct a schema, using GraphQL schema language
const typeDefs = `
  directive @upper on FIELD_DEFINITION
  directive @concat(value: String!) on FIELD_DEFINITION

  type Query {
    foo: String @concat(value: "@gmail.com") @upper
  }
`;

// Customs directives, check https://github.com/apollographql/graphql-tools/pull/518
// for more examples
const directiveResolvers = {
  upper(
    next,
    src,
    args,
    context,
  ) {
    return next().then((str) => {
      if (typeof(str) === 'string') {
        return str.toUpperCase();
      }
      return str;
    });
  },
  concat(
    next,
    src,
    args,
    context,
  ) {
    return next().then((str) => {
      if (typeof(str) !== 'undefined') {
        return `${str}${args.value}`;
      }
      return str;
    });
  },
}

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    foo: (root, args, context) => {
      return 'foo';
    },
  },
};

// Required: Export the GraphQL.js schema object as "schema"
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers,
});
```

The result with query `{foo}` will be:
```json
{
  "data": {
    "foo": "FOO@GMAIL.COM"
  }
}
```

## API

### directiveResolvers option

```js
import { makeExecutableSchema } from 'graphql-tools';

const directiveResolvers = {
  // directive resolvers implement
};

const schema = makeExecutableSchema({
  // ... other options
  directiveResolvers,
})
```

`makeExecutableSchema` has new option field is `directiveResolvers`, a map object for custom Directive's resolvers.

### attachDirectiveResolvers

```js
import { attachDirectiveResolvers } from 'graphql-tools';

const directiveResolvers = {
  // directive resolvers implement
};

attachDirectiveResolvers({
  schema,
  directiveResolvers,
});
```

Given an instance of GraphQLSchema and a `directiveResolvers` map object, `attachDirectiveResolvers` wrap all field's resolver with directive resolvers.
