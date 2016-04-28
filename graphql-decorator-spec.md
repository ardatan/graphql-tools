# Draft specification for GraphQL Schema Decorators

Decorators can be used to modify a GraphQL schema behavior, somewhat similar to directives
which modify the way a GraphQL server executes a query.

The intent of schema decorators is to make GraphQL schemas more malleable without the need
for modifying the current spec. Decorators don't enable anything that wasn't possible before,
but they make some common patterns much more reusable.

Decorators can be used for a variety of purposes:
* Adding metadata to the schema
* Authorization
* Argument validation
* Filtering of results
* Logging & profiling
* Error handling
* Backend connectors

GraphQL schema decorators use the `+` sign to distinguish them from directives, which use the `@` sign and come **after** the thing they're modifying. They could both share the `@sign`, but then decorators would have to come after the thing they decorate, which looks a bit awkward.

Here is an example of decorators on a schema specified with GraphQL schema language:
```
+connector(storage: "mongoDB")
+id(fields: ["uuid"])
type Person {
  uuid: String!
  name: String!

  +deprecated(reason: "Use the 'name' field instead")
  longName: String
  friends: [Person]
}

type RootQuery {
  +description(text: "find a person by name")
  findPerson(name: String!)

  +adminOnly
  +log(type: "adminAccess")
  allPersons(
    page: Int = 0

    +validateRange(min: 1, max: 10)
    numPages: Int = 1
  ): [Person]
}

type RootMutation {
  +requiresAuthentication
  +log(type: "userAccess")
  addPerson(
    +maxLen(100)
    name: String!
  ): Int

  +adminOnly
  +log(type: "adminAccess")
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

```es6
class SampleFieldDecorator extends SchemaDecorator {
  const tag = 'sample'; // matches +sample in GraphQL schema language
  const locations = ['field', 'type', 'interface', 'union']; // where this decorator can be applied

  // the argSignature can be used to check whether a decorator's arguments are valid.
  const argSignature = {
    type: GraphQLString,
    min: GraphQLInt,
    max: GraphQLInt
  };

  // the constructor is used to configure things once per server, such as database credentials.
  // if the same decorator class is to be used with different configurations, then two instances
  // with different prefixes have to be created.
  constructor(config, prefix = ''){
    this.config = config;
    this.prefix = prefix;
  }

  getTag(){
    return this.prefix + tag;
  }

  isWellPlaced(locationName){
    return locations.indexOf(locationName) >= 0;
  }

  getArgSignature(){
    return argSignature;
  }

  // apply returns a function which gets applied to the decorated thing.
  apply(){

    // context says what scope this decorator is being applied to, i.e. 'type', 'schema', 'field' etc.
    return (wrappedThing, { schema, type, field, context }) => {
      // use this.config ...
      // use args
      // modify wrappedThing's properties, resolve functions, etc.
    }
  }
}
```

When constructing a GraphQL schema from GraphQL schema language with decorators, all decorators need to be specified and given to the schema generation function, otherwise an error will be thrown:

```es6
import { Description, Deprecated, Validator } from 'graphql-decorators';
const shorthandSchema = gql` ... schema here `;

const availableDecorators = [ new Description(), new Deprecated(), new Validator()];

// fictional example, not the actual function signature:
const schema = makeExecutableSchema({
  schema: shorthandSchema,
  decorators: availableDecorators
});
```

## Applying decorators to a GraphQL-JS schema

The use of schema decorators is most immediately obvious in GraphQL schema language, but they can also be applied to a GraphQL-JS schema. You might want to do this to get portable components that can be used across many schemas. Here is an example:

```es6
import { Description, DeprecationReason, Validator } from 'graphql-decorators';
// ... more imports ...
const deprecationReason = new DeprecationReason();
const description = new Description();
const validator = new Validator();

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQuery',
    decorators: [ description.apply({ text: 'This is the root query' }) ],
    fields: () => {
      getString: {
        type: GraphQLString,
        decorators: [ deprecationReason.apply({ text: 'This field never did anything useful' })],
        resolve(root, {str}){ return str; },
        args: {
          str: {
            type: GraphQLString,
            decorators: [ validator.apply({ type: 'length', min: 1, max: 1000 }) ]
          },
        },
      },
    },
  }),
});
```

To apply these decorators, the function `applySchemaDecorators(schema)` has to be called like so:

```es6
import { applySchemaDecorators } from 'graphql-tools';

const schema = new GraphQLSchema({
  // schema definition here
});

applySchemaDecorators(schema); // applies the decorators to the schema in place.
```

Many decorators can be used on the server as well as the client, which means they have to be part of the information returned by the introspection query. However, only the tag and the arguments should be shared with the client, not the configuration. The client will most likely need different configuration.

Some decorators may need to be server-only, in which case they should not be introspectable by the client.


Decorators can be used to add metadata to a GraphQL schema in a way that is portable across different servers and clients. As long as the semantics of a decorator are well-specified, there could be GraphQL-JS, Graphene, Apollo-client, Relay, Sangria, etc. implementations for the same decorator, which given the same decorator tag and arguments will do the same thing on all these different implementations. For example, they could be used to provide optimistic UI in apollo-client and relay with zero additional code: The server version of the decorator modifies a mutation so it updates a specific store, the client version (eg. apollo-client) updates the client cache instead.
