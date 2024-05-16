---
"@graphql-tools/federation": patch
"@graphql-tools/delegate": patch
---

Handle interface types with non-shared implementations;

For example, you have the following services, where `Node` is implemented in both services, but `Foo` and `Bar` are only implemented in one service.
And when the gateway receives the following query, it should be converted to this because `Node` is not implemented as `Bar` in Service 1 while implemented in Service 2.

Query conversion;

```graphql
# Gateway request
query {
  fooBar(id: "1") {
    ... on Node {
      id
    }
  }
}
```

```graphql
# Service 1 Request
query {
  fooBar(id: "1") {
    ... on Foo {
      id
    }
    ... on Bar {
      id
    }
  }
}
```

Services;

```graphql
# Service 1

union FooBar = Foo | Bar

interface Node {
  id: ID!
}

type Foo implements Node {
  id: ID!
}

type Bar {
  id: ID!
}

type Query {
  fooBar(id: ID!): FooBar
}
```

```graphql
# Service 2
interface Node {
  id: ID!
}

type Foo implements Node {
  id: ID!
}

type Bar implements Node {
  id: ID!
}
```
