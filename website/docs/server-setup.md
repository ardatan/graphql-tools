---
id: server-setup
title: Setup an HTTP server
sidebar_label: Setup an HTTP server
---

Here's an example using express-graphql:

```js
const express = require('express');
const graphqlHTTP = require('express-graphql');

const typeDefs = require('./graphql/types');
const resolvers = require('./graphql/resolvers');

const { makeExecutableSchema } = require('graphql-tools');

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const app = express();
app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true,
}));

app.listen(3000, () => {
    console.info('Listening on http://localhost:3000/graphql');
});
```
