# GraphQL connectors

## What is a connector?

A connector is the piece of code that links your GraphQL server to different backends. Connectors are called in resolve functions to fetch data from a cache or a backend. Connectors have two functions:

- Make it as easy as possible to fetch data from different backends
- Move any complex fetching logic from resolve functions into separate modules (connectors)

## How to use connectors in apollo server

Connectors are easy to use in apollo server, requiring just three steps:

Step 1: Importing 
```
import MongoDBConnector from 'apollo-connectors/mongodb';
```

Step 2: Configuring 
```
const mongo = new MongoDBConnector({ host: 'localhost', port: 27001, user: ENV.MONGO_USER password: ENV.MONGO_PASSWORD });
```

Step 3: Adding connectors to the context
```
app.use('/graphql', apolloServer({
  schema: Schema,
  connectors: {
    mongo
  }
});
```

Step 4: Calling connectors in resolve functions
```
function resolve(parent, args, ctx, info){
  return ctx.connectors.mongo.findOne({ id: args.id });
}
```
