---
title: Schema directives
description: Implementing and using custom `@directive`s that transform schema types, fields, and arguments
---

## Schema directives

A _directive_ is an identifier preceded by a `@` character, optionally followed by a list of named arguments, which can appear after almost any form of syntax in the GraphQL query or schema languages.

The [GraphQL specification](http://facebook.github.io/graphql/October2016/#sec-Type-System.Directives) requires every server implementation to support at least two directives, `@skip(if: Boolean)` and `@include(if: Boolean)`, which can be used during query execution to conditionally omit or include certain fields. The [GraphQL.js reference implementation](https://github.com/graphql/graphql-js) provides one additional built-in [`@deprecated`](https://github.com/graphql/graphql-js/blob/master/src/type/directives.js) directive, which is useful for indicating that a field or `enum` value should no longer be used.

However, the formal syntax of the GraphQL query and schema languages allows arbitrary user-defined `@directive`s to appear as modifiers following almost any kind of type, field, or argument. Unless the server ascribes special meaning to these annotations, they are typically ignored after parsing, almost as if they were comments. But if the server knows how to interpret them, `@directive` annotations can be a powerful tool for preventing repetition, specifying extra behavior, enforcing additional type or value restrictions, and enabling static analysis.

This document focuses on `@directive`s that appear in GraphQL _schemas_ written in Schema Definition Language (SDL), as described in the [Schemas and Types](http://graphql.org/learn/schema/) section of the GraphQL.org documentation. These `@directive`s can be used to modify the structure and behavior of a GraphQL schema in ways that would not be possible using SDL syntax alone.

In order for a `@directive` to have any consequences, the GraphQL server must be configured to apply a specific implementation of that `@directive` to the `GraphQLSchema` object. This document describes one possible approach to defining reusable `@directive` implementations, namely the `SchemaDirectiveVisitor` abstraction provided by the `graphql-tools` npm package.

The possible applications of `@directive` syntax are numerous: enforcing access permissions, formatting date strings, auto-generating resolver functions for a particular backend API, marking strings for internationalization, synthesizing globally unique object identifiers, specifying caching behavior, skipping or including or deprecating fields, and just about anything else you can imagine.

## Implementing schema directives

Since the GraphQL specification does not discuss any specific implementation strategy for `@directive`s, it's up to each GraphQL server framework to expose an API for implementing new directives.

If you're using Apollo Server, you are also likely to be using the [`graphql-tools`](https://github.com/apollographql/graphql-tools) npm package, which provides a convenient yet powerful tool for implementing `@directive` syntax: the [`SchemaDirectiveVisitor`](https://github.com/apollographql/graphql-tools/blob/wip-schema-directives/src/schemaVisitor.ts) class.

To implement a schema `@directive` using `SchemaDirectiveVisitor`, simply create a subclass of `SchemaDirectiveVisitor` that overrides one or more of the following visitor methods:

* `visitSchema(schema: GraphQLSchema)`
* `visitScalar(scalar: GraphQLScalarType)`
* `visitObject(object: GraphQLObjectType)`
* `visitFieldDefinition(field: GraphQLField<any, any>)`
* `visitArgumentDefinition(argument: GraphQLArgument)`
* `visitInterface(iface: GraphQLInterfaceType)`
* `visitUnion(union: GraphQLUnionType)`
* `visitEnum(type: GraphQLEnumType)`
* `visitEnumValue(value: GraphQLEnumValue)`
* `visitInputObject(object: GraphQLInputObjectType)`
* `visitInputFieldDefinition(field: GraphQLInputField)`

By overriding methods like `visitObject`, a subclass of `SchemaDirectiveVisitor` expresses interest in certain schema types such as `GraphQLObjectType` (the first parameter type of `visitObject`).

When `SchemaDirectiveVisitor.visitSchemaDirectives` is called with a `GraphQLSchema` object and a map of visitor subclasses (`{ [directiveName: string]: typeof SchemaDirectiveVisitor }`), visitor methods overridden by those subclasses will be called with references to any schema type objects that have appropriately named `@directive`s attached to them, enabling the visitors to inspect or modify the schema.

For example, if a directive called `@rest(url: "...")` appears after a field definition, a `SchemaDirectiveVisitor` subclass could provide meaning to that directive by overriding the `visitFieldDefinition` method (which receives a `GraphQLField` parameter), and then the body of that visitor method could manipulate the field's resolver function to fetch data from a REST endpoint:

```typescript
import {
  makeExecutableSchema,
  SchemaDirectiveVisitor,
} from "graphql-tools";

const typeDefs = `
type Query {
  people: [Person] @rest(url: "/api/v1/people")
}`;

const schema = makeExecutableSchema({ typeDefs });

SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
  rest: class extends SchemaDirectiveVisitor {
    public visitFieldDefinition(field: GraphQLField<any, any>) {
      const { url } = this.args;
      field.resolve = () => fetch(url);
    }
  }
});
```

The subclass in this example is defined as an anonymous `class` expression, for brevity. A truly reusable `SchemaDirectiveVisitor` would most likely be defined in a library using a named class declaration, and then exported for consumption by other modules and packages.

It's also possible to pass directive implementations to `makeExecutableSchema` via the `directiveVisitors` parameter, if you prefer:

```typescript
const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    rest: class extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>) {
        const { url } = this.args;
        field.resolve = () => fetch(url);
      }
    }
  }
});
```

Note that a subclass of `SchemaDirectiveVisitor` may be instantiated multiple times to visit multiple different `@directive` occurrences, or even `@directive`s of different names. In other words, `SchemaDirectiveVisitor` implementations are effectively anonymous, and it's up to the caller of `SchemaDirectiveVisitor.visitSchemaDirectives` to assign names to them.

## Declaring schema directives

While the above examples should be sufficient to implement any `@directive` used in your schema, SDL syntax also supports declaring the names, argument types, default argument values, and permissible locations of any available directives:

```js
directive @auth(
  requires: Role = ADMIN,
) on OBJECT | FIELD_DEFINITION

enum Role {
  ADMIN
  REVIEWER
  USER
  UNKNOWN
}

type User @auth(requires: USER) {
  name: String
  banned: Boolean @auth(requires: ADMIN)
  canPost: Boolean @auth(requires: REVIEWER)
}
```

This hypothetical `@auth` directive takes an argument named `requires` of type `Role`, which defaults to `ADMIN` if `@auth` is used without passing an explicit `requires` argument. The `@auth` directive can appear on an `OBJECT` like `User` to set a default access control for all `User` fields, and also on individual fields, to enforce field-specific `@auth` restrictions.

Enforcing the requirements of the declaration is something a `SchemaDirectiveVisitor` implementation could do itself, in theory, but the SDL syntax is easer to read and write, and provides value even if you're not using the `SchemaDirectiveVisitor` abstraction.

However, if you're attempting to implement a reusable `SchemaDirectiveVisitor`, you may not be the one writing the SDL syntax, so you may not have control over which directives the schema author decides to declare, and how. That's why a well-implemented, reusable `SchemaDirectiveVisitor` should consider overriding the `getDirectiveDeclaration` method:

```typescript
class AuthDirectiveVisitor extends SchemaDirectiveVisitor {
  public visitObject(object: GraphQLObjectType) {...}
  public visitFieldDefinition(field: GraphQLField<any, any>) {...}

  public static getDirectiveDeclaration(
    directiveName: string,
    previousDirective?: GraphQLDirective,
  ): GraphQLDirective {
    previousDirective.args.forEach(arg => {
      if (arg.name === 'requires') {
        // Lower the default minimum Role from ADMIN to REVIEWER.
        arg.defaultValue = 'REVIEWER';
      }
    });
    return previousDirective;
  }
}
```

Since the `getDirectiveDeclaration` method receives not only the name of the directive but also any previous declaration found in the schema, it can either return a totally new `GraphQLDirective` object, or simply modify the `previousDirective` and return it. Either way, if the visitor returns a non-null `GraphQLDirective` from `getDirectiveDeclaration`, that declaration will be used to check arguments and permissible locations.

## Examples

To appreciate the range of possibilities enabled by `SchemaDirectiveVisitor`, let's examine a variety of practical examples.

### Uppercasing strings

Suppose you want to ensure a string-valued field is converted to uppercase:

```typescript
const typeDefs = `
directive @upper on FIELD_DEFINITION

type Query {
  hello: String @upper
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    upper: class extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve } = field;
        field.resolve = async function (...args) {
          const result = await resolve.apply(this, args);
          if (typeof result === "string") {
            return result.toUpperCase();
          }
          return result;
        }
      }
    }
  }
});
```

### Formatting date strings

Suppose your resolver returns a `Date` object but you want to return a formatted string to the client:

```typescript
const typeDefs = `
directive @date(format: String) on FIELD_DEFINITION

scalar Date

type Post {
  published: Date @date(format: "mmmm d, yyyy")
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    date: class extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve } = field;
        field.resolve = async function (...args) {
          const date = await resolve.apply(this, args);
          return require("dateformat")(date, this.args.format);
        };
      }
    }
  }
});
```

### Marking strings for internationalization

```typescript
const typeDefs = `
directive @intl on FIELD_DEFINITION

type Query {
  greeting: String @intl
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    date: class extends SchemaDirectiveVisitor {
      public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        objectType: GraphQLObjectType,
      }) {
        const { resolve } = field;
        field.resolve = async function (...args) {
          const context = args[2];
          const defaultText = await resolve.apply(this, args);
          // In this example, path would be ["Query", "greeting"]:
          const path = [details.objectType.name, field.name];
          return translate(defaultText, path, context.locale);
        };
      }
    }
  }
});
```

### Enforcing access permissions

Suppose you want to implement the `@auth` example mentioned above:

```typescript
const typeDefs = `
directive @auth(
  requires: Role = ADMIN,
) on OBJECT | FIELD_DEFINITION

enum Role {
  ADMIN
  REVIEWER
  USER
  UNKNOWN
}

type User @auth(requires: USER) {
  name: String
  banned: Boolean @auth(requires: ADMIN)
  canPost: Boolean @auth(requires: REVIEWER)
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    auth: class extends SchemaDirectiveVisitor {
      private authReqSymbol = Symbol.for("@auth required role");
      private authWrapSymbol = Symbol.for("@auth wrapped");

      public visitObject(type: GraphQLObjectType) {
        this.ensureFieldsWrapped(type);
        type[authReqSymbol] = this.args.required;
      }

      public visitFieldDefinition(field: GraphQLField<any, any>, details: {
        // The parent GraphQLObjectType of this GraphQLField:
        objectType: GraphQLObjectType,
      }) {
        this.ensureFieldsWrapped(details.objectType);
        field[this.authReqSymbol] = this.args.required;
      }

      private ensureFieldsWrapped(type: GraphQLObjectType) {
        const { authWrapSymbol, authReqSymbol } = this;
        // Mark the GraphQLObjectType object to avoid re-wrapping its fields:
        if (type[authWrapSymbol]) return;
        type[authWrapSymbol] = true;

        type.getFields().forEach(field => {
          const { resolve } = field;
          field.resolve = async function (...args) {
            const requiredRole = field[authReqSymbol] || type[authReqSymbol];
            if (! requiredRole) {
              return resolve.apply(this, args);
            }
            const context = args[2];
            const user = await getUser(context.headers.authToken);
            if (! user.hasRole(requiredRole)) {
              throw new Error("not authorized");
            }
            return resolve.apply(this, args);
          };
        });
      }
    }
  }
});
```

### Enforcing value restrictions

Suppose you want to enforce a maximum length for a string-valued field:

```typescript
const typeDefs = `
directive @length(max: Int) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

type Query {
  books: [Book]
}

type Book {
  title: String @length(max: 50)
}

type Mutation {
  createBook(input: BookInput): Book
}

input BookInput {
  title: String! @length(max: 50)
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    length: class extends SchemaDirectiveVisitor {
      public visitInputFieldDefinition(field: GraphQLInputField) {
        this.wrapType(field);
      }

      public visitFieldDefinition(field: GraphQLField<any, any>) {
        this.wrapType(field);
      }

      private helper(field: GraphQLInputField | GraphQLField<any, any>) {
        // This LimitedLengthType should be just like field.type except that the
        // serialize method enforces the length limit. For more information about
        // GraphQLScalar type serialization, see the graphql-js implementation:
        // https://github.com/graphql/graphql-js/blob/31ae8a8e8312494b858b69b2ab27b1837e2d8b1e/src/type/definition.js#L425-L446
        field.type = new LimitedLengthType(field.type, this.args.max);
      }
    }
  }
});
```

### Synthesizing unique IDs

Suppose your database uses an incrementing ID for each resource type, so IDs are not unique across all resource types. Here's how you might synthesize a field called `uid` that combines the object type with the non-unique ID to produce an ID that's unique across your schema:

```typescript
const typeDefs = `
type Person @uniqueID(name: "uid", from: ["personID"]) {
  personID: Int
  name: String
}

type Location @uniqueID(name: "uid", from: ["locationID"]) {
  locationID: Int
  address: String
}`;

const schema = makeExecutableSchema({
  typeDefs,
  directiveVisitors: {
    uniqueID: class extends SchemaDirectiveVisitor {
      public visitObject(type: GraphQLObjectType) {
        const { name, from } = this.args;
        object.getFields()[name] = {
          name: name,
          type: GraphQLID,
          description: 'Unique ID',
          args: [],
          resolve(object) {
            const hash = require("crypto").createHash("sha256");
            hash.update(type.name);
            from.forEach(fieldName => {
              hash.update(String(object[fieldName]));
            });
            return hash.digest("hex");
          }
        };
      }
    }
  }
});
```

## Older directive example

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
