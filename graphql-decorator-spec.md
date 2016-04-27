# Draft specification for GraphQL Schema Decorators

Decorators can be used to modify a GraphQL schema behavior, somewhat similar to directives
which modify the way a GraphQL server executes a query.

The intent of schema decorators is to make GraphQL schemas more malleable without the need
for modifying the current spec. Decorators don't enable anything that wasn't possible before,
but they make some common patterns much more reusable.

Decorators can be used for a variety of purposes:
* Authorization
* Argument validation
* Filtering of results
* Logging & profiling
* Error handling
* Backend connectors

Here is an example of decorators on a schema specified with GraphQL schema language:
```
@connector(storage: "mongoDB")
@id(fields: ["uuid"])
type Person {
  uuid: String!
  name: String!
  
  @deprecationReason(reason: "Use the 'name' field instead")
  longName: String
  friends: [Person]
}

type RootQuery {
  @description(text: "find a person by name")
  findPerson(name: String!)

  @adminOnly
  @log(type: "adminAccess")
  allPersons(
    page: Int = 0

    @validateRange(min: 1, max: 10)
    numPages: Int = 1
  ): [Person]
}

type RootMutation {
  @requiresAuthentication
  @log(type: "userAccess")
  addPerson(
    @maxLen(100)
    name: String!
  ): Int

  @adminOnly
  @log(type: "adminAccess")
  removePerson(id: Int!): Boolean
}

schema {
  query: RootQuery
  mutation: RootMutation
}
```

In GraphQL schema language, arguments to decorators follow the same spec as arguments to fields.

## What decorators do:
Decorators can be selectively applied to:
* The schema
* A specific type (object type, union, interface, input, scalar)
* A specific field
* An argument

Decorators can modify the behavior of the parts of the schema they are applied to. Sometimes that requires modifying other parts of the schema. For instance, the @validateRange decorator modifies the behavior of the containing field's resolve function.

In general, decorators either add, remove or modify an attribute of the thing they wrap. The most common type of decorator (e.g. @adminOnly, @log, @connector) will wrap one or more field's resolve functions to alter the execution behavior of the GraphQL schema, but other decorators (e.g. @description) may add attributes to a type, field or argument. It is also possible for a type decorator to add a field to the type (e.g. @id(fields: ["uuid"]) can add the __id field).


## Schema decorator API
All decorators must extend the SchemaDecorator class and implement the following interfaces:

[WIP]
