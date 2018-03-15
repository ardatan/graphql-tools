---
title: Schema delegation
description: Forward queries to other schemas automatically
---

Schema delegation is a way to automatically forward query or a part of the query from the schema one is executing now to another schema called `subschema`. Delegation is useful when your parent schema shares big part of its model with the subschema. This is often the case when, eg, building a GraphQL gateway by connecting multiple schemas together. Several useful tools exist to work together with delegation in `graphql-tools`:

* [Remote schemas](./remote-schemas.html) - turning a remote GraphQL endpoint into a local GraphQL schema
* [Schema transforms](./schema-transforms.html) - manipulating with schemas, while keep ability to delegate to them
* [Schema stitching](./schema-stitching) - extending schemas and connecting multiple schemas together

Delegation is performed by one function - `delegateToSchema`. It should be called from within a parent schema resolver. It uses the GraphQL query tree starts at the resolver to create a query that will be executed on a subschema.

<h2 id="example">Motivational example</h2>

Let's consider our schemas, a subschema and a parent schema that reuses parts of a subschema. While parent schema reuses the *definitions* of the subschema, we want to keep implementation separate. This way the subschema can be tested and used separately or even be a remote service.

```graphql
# Subschema
type Repository {
  id: ID!
  url: String
  issues: [Issue]
  userId: ID!
}

type Issue {
  id: ID!
  text: String!
  repository: Repository!
}

type Query {
  repositoryById(id: ID!): Repository
  repositoriesByUserId(id: ID!): [Repository]
}

# Schema
type Repository {
  id: ID!
  url: String
  issues: [Issue]
  userId: ID!
  user: User
}

type Issue {
  id: ID!
  text: String!
  repository: Repository!
}

type User {
  id: ID!
  username: String
  repositories: [Repository]
}

type Query {
  userById(id: ID!): User
}
```

We want parent schema to delegate retrieval of repositories to the subschema. Assuming a query as following:

```graphql
query {
  userById(id: "1") {
    id
    username
    repositories {
      id
      url
      user
      issues {
        text
      }
    }
  }
}
```

At resolver for `repositories`, we would delegate. While it's possible to simply call a graphql endpoint of this schema or execute manually, this would require us to manually convert the query or always fetch all possible fields, which could lead to overfetching. Delegation automatically extracts the query.

```graphql
# To the subschema
query($id: ID!) {
  repositoriesByUserId(id: $id) {
    id
    url
    issues {
      text
    }
  }
}
```

Delegation also removes the fields that don't exist on the subschema, such as user. This field would be retrieved on our parent schema using normal GraphQL resolvers.

<h2 id="api">API</h2>

<h3 id="delegateToSchema">delegateToSchema</h3>

```
function delegateToSchema(
  targetSchema: GraphQLSchema,
  targetOperation: 'query' | 'mutation' | 'subscription',
  targetField: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
  transforms?: Array<Transform>,
): Promise<any>
```

#### targetSchema: GraphQLSchema

A subschema to delegate to.

#### targetOperation: 'query' | 'mutation' | 'subscription'

An operation to use during the delegation.

#### targetField: string

A root field in a subschema from which the query should start.

#### args: { [key: string]: any }

Additional arguments to be passed to the field. Arguments on the field that is being resolved are going to be kept if they are valid, this allows adding additional arguments or overriding them. For example:

```graphql
# Subschema

type Booking {
  id: ID!
}

type Query {
  bookingsByUser(userId: ID!, limit: Int): [Booking]
}

# Schema

type User {
  id: ID!
  bookings(limit: Int): [Booking]
}

type Booking {
  id: ID!
}
```

If we are to delegate at `User.bookings` to `bookingsByUser`, we want to preserve the `limit` argument and add an `userId` argument by using the `User.id`. So the resolrver would look like the following:

```js
bookings(parent, args, context, info) {
  return delegateToSchema(
    subschema,
    'query',
    'bookingsByUser',
    {
      userId: parent.id,
    },
    context,
    info,
  );
}
```

#### context: { [key: string]: any }

GraphQL context that is going to be past to subschema execution or subsciption call.

#### info: GraphQLResolveInfo

GraphQL resolve info of the current resolver. Used to get the query that starts at the current resolver

#### transforms: Array<Transform>

[Transforms](./transforms.html) to apply to the query and results. Should be the
same transformed that were used to transform the schema, if any. One can use `transformedSchema.transforms` to retrieve transforms.

<h2 id="considerations">Additional considerations</h2>

### Aliases

Delegation preserves aliases that are passed from the parent query. However that presents problems, because default GraphQL resolvers retrieve field from parent based on their name, not aliases. This way results with aliases will be missing from the delegated result. `mergeSchemas` and `transformSchemas` go around that by using `src/stitching/defaultMergedResolver` for all fields without explicit resolver. When building new libraries around delegation, one should consider how the aliases will be handled.
