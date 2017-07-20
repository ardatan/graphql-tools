---
title: Custom scalars
order: 309
description: Add custom scalars to your graphql-tools generated schema.
---

The GraphQL specification includes the following default scalar types: `String`, `Int`, `Float` and `Boolean`. While this covers most of the user cases, often you need to support custom atomic data types (e.g. Date), or you want a version of an existing type that does some validation. To enable this, GraphQL allows you to define custom scalar types.

To define a custom scalar you simply add it to the schema string with the following notation:

```js
scalar MyCustomScalar
```

Afterwards, you have to define the behavior of your `MyCustomScalar` custom scalar by passing an instance of the [`GraphQLScalarType`](http://graphql.org/graphql-js/type/#graphqlscalartype) class in the [resolver map](/tools/graphql-tools/resolvers.html#Resolver-map). This instance can be defined in a [dependency package](#Using-a-package) or [in your own code](#Own-GraphQLScalarType-instance).

For more information about GraphQL's type system, please refer to the [official documentation](http://graphql.org/graphql-js/type/) or to the [Learning GraphQL](https://github.com/mugli/learning-graphql/blob/master/7.%20Deep%20Dive%20into%20GraphQL%20Type%20System.md) tutorial.

Note that [Apollo Client does not currently have a way to automatically interpret custom scalars](https://github.com/apollostack/apollo-client/issues/585), so there's no way to automatically reverse the serialization on the client.

## Using a package

Here, we'll take the [graphql-type-json](https://github.com/taion/graphql-type-json) package as an example to demonstrate what can be done. This npm package defines a JSON GraphQL scalar type.

* Add the `graphql-type-json` package to your project's dependencies :
```shell
$ npm install --save graphql-type-json
```

* In your JavaScript code, require the type defined by in the npm package and use it :

```js
import { makeExecutableSchema } from 'graphql-tools';
import GraphQLJSON from 'graphql-type-json';

const schemaString = `

scalar JSON

type Foo {
  aField: JSON
}

type Query {
  foo: Foo
}

`;

const resolveFunctions = {
  JSON: GraphQLJSON
};

const jsSchema = makeExecutableSchema({ typeDefs: schemaString, resolvers: resolveFunctions });
```

Remark : `GraphQLJSON` is a [`GraphQLScalarType`](http://graphql.org/graphql-js/type/#graphqlscalartype) instance.

## Own `GraphQLScalarType` instance

If needed, you can define your own [GraphQLScalarType](http://graphql.org/graphql-js/type/#graphqlscalartype) instance. This can be done the following way :

```js
import { GraphQLScalarType } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';

const myCustomScalarType = new GraphQLScalarType({
  name: 'MyCustomScalar',
  description: 'Description of my custom scalar type',
  serialize(value) {
    let result;
    // Implement your own behavior here by setting the 'result' variable
    return result;
  },
  parseValue(value) {
    let result;
    // Implement your own behavior here by setting the 'result' variable
    return result;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      // Implement your own behavior here by returning what suits your needs
      // depending on ast.kind
    }
  }
});

const schemaString = `

scalar MyCustomScalar

type Foo {
  aField: MyCustomScalar
}

type Query {
  foo: Foo
}

`;

const resolverFunctions = {
  MyCustomScalar: myCustomScalarType
};

const jsSchema = makeExecutableSchema({ typeDefs: schemaString, resolvers: resolveFunctions });
```

## Examples

Let's look at a couple of examples to demonstrate how a custom scalar type can be defined.

### Date as a scalar

The goal is to define a `Date` data type for returning `Date` values from the database. Let's say we're using a MongoDB driver that uses the native JavaScript `Date` data type. The `Date` data type can be easily serialized as a number using the [`getTime()` method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime). Therefore, we would like our GraphQL server to send and receive `Date`s as numbers when serializing to JSON. This number will be resolved to a `Date` on the server representing the date value. On the client, the user can simply create a new date from the received numeric value.

The following is the implementation of the `Date` data type. First, the schema:

```js
scalar Date

type MyType {
   created: Date
}
```

Next, the resolver:

```js
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const resolverMap = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),
};
```

### Validations

In this example, we follow the [official GraphQL documentation](http://graphql.org/docs/api-reference-type-system/) for the scalar datatype. Let's say that you have a database field that should only contain odd numbers. First, the schema:

```js
scalar Odd

type MyType {
    oddValue: Odd
}
```

Next, the resolver:

```js
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

function oddValue(value) {
  return value % 2 === 1 ? value : null;
}

const resolverMap = {
  Odd: new GraphQLScalarType({
    name: 'Odd',
    description: 'Odd custom scalar type',
    parseValue: oddValue,
    serialize: oddValue,
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return oddValue(parseInt(ast.value, 10));
      }
      return null;
    },
  }),
};
```
