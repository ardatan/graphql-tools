# Connectors and models

## What is a connector?

A connector is the piece of code that links your GraphQL server to different backends. Connectors batch requests to the backend and cache responses. Good connector have two properties:

- Make it as easy as possible to fetch data from different backends
- Make fetching from backends efficient by batching requests and caching responses

## What is a model?

Models in Apollo server are specific to each GraphQL object type and provide an abstraction on top of the connector. They are similar to models in ORMs. Let's say for example that you have two types, Author and Post, which are both stored in MongoDB. Rather than calling the MongoDB connector directly from your resolve funcitons, you use the Author and Post models, which use the MongoDB connector. This additional level of abstraction helps separate the data fetching logic from the GraphQL schema, which makes reusing and refactoring it easier.

## How to use connectors and models in apollo server

Connectors are easy to use in apollo server, requiring just three steps:

Step 1: Import the connector
```
import MongoDBConnector from 'apollo-connectors/mongodb';
```

Step 2: Configure the connector 
```
const mongo = new MongoDBConnector({ host: 'localhost', port: 27001, user: ENV.MONGO_USER password: ENV.MONGO_PASSWORD });
```

Step 3: Create the model
```
class Author {
  constructor({connector}){
    this.connector = connector;
  }
  get(id){
    return this.connector.findOne({ _id: id });
  }
}
```

Step 4: Adding models to the context
```
app.use('/graphql', apolloServer({
  schema: Schema,
  models: {
    new Author({ connector: mongo }),
    new Post({ connector: mongo }),
  }
});
```

Step 4: Calling connectors in resolve functions
```
function resolve(parent, args, ctx, info){
  return ctx.models.Post.get(args.id);
}
```
