# Connectors and models

This document is intended as a design document for people who want to write connectors for various backends. Its main purpose is to specify what properties connectors should have so they can be easily shared with other people and used in Apollo without any shims.


Technically you could write a GraphQL server without connectors and models by writing all your logic directly into the resolve functions, but in most cases that's not ideal. Connectors and models are a way of organizing code in a GraphQL server, and you should use them to keep your server modular. If the need arises, you can always write optimized queries directly in your resolvers or models should the need arise.

Let's use an example schema, because it's always easier to explain things with examples:
```
type Author {
  id: ID!
  name: String
  posts: [Post]
}

type Post {
  id: ID!
  title: String
  text: String
  views: Int
  author: Author
}

type Query {
  author(id: ID!): Author
  searchPosts(titleContains: String): [Post]
}
```

In this example, an author has mutliple posts, and each post has one author.

Here's an illustration for how connectors and models would look like for this example if Authors and Posts were stored in MySQL, but view counts in MongoDB:

(connector-model-diagram.png)[Connectors are database-specfic, models are application-specific]

Let's look at things from the bottom up.

## What's in a connector?

A connector is the piece of code that links a GraphQL server a backends. Each backend (eg. MySQL, MongoDB, S3, neo4j) will have its own connector. Apart from connecting the GraphQL server to a backend, connectors should also:

- Batch requests together whenever it makes sense
- Cache data fetched for the backend to avoid extra requests (at least for the duration of one query)
- Provide a way to log information about data fetched, such as how long the request took, how much data was fetched etc.


## What's in a model?

Models are the glue between connectors - which are backend-specific - and GraphQL types - which are app-specific. They are very similar to models in ORMs, such as Rails' Active Record.

Let's say for example that you have two types, Author and Post, which are both stored in MySQL. Rather than calling the MySQL connector directly from your resolve funcitons, you should create models for Author and Post, which use the MongoDB connector. This additional level of abstraction helps separate the data fetching logic from the GraphQL schema, which makes reusing and refactoring it easier.

In the example schema above, the Authors model would have the following methods:
```
const Author = {
  getById(id){ ... }; // get an Author by id.
}
```

The Posts model would have the following methods:
```
const Posts = {
  getById(id){ ... }; // get Post by id
  getByTitleContains(contains){ ... }; //get a list of posts that have a word in the title
  getByAuthor(authorId){ ... }; // get list of posts by a certain author
  views(postId); // get the number of views for post with ID postId
}
```
note: it might also make sense to implement models as classes and have instances represent the actual objects. If you have some thoughts about that, please open an issue.

In some cases it may be a good idea for your `getById` (and other) methods to take the list of fields to be fetched as an additional argument. That way the model layer can make sure to fetch only the data required from the backend. This is especially important for types that have large fields which are not always required.


**Common question:** Are models the same as GraphQL types?
**Answer:** There will almost always be a 1:1 correspondence between types in your schema and the models, so it makes sense to keep them in the same file, or at least in the same folder. While the GraphQL schema describes the types and their relationships, the models define which connectors should be used to fetch the actual data for that type.


## How to use connectors and models in apollo server
note: This is a design document. At the time of writing there are no connectors. As we build connectors, we'll add them to the docs.

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
