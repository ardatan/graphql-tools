---
title: graphql-tools
description: A set of utilities to build your JavaScript GraphQL schema in a concise and powerful way.
---

GraphQL Tools is an npm package and an opinionated structure for how to build a GraphQL schema and resolvers in JavaScript, following the GraphQL-first development workflow.

```txt
npm install graphql-tools graphql
```

Functions in the `graphql-tools` package are not just useful for building servers. They can also be used in the browser, for example to mock a backend during development or testing.

Even though we recommend a specific way of building GraphQL servers, you can use these tools even if you don't follow our structure; they work with any GraphQL-JS schema, and each tool can be useful on its own.

<h2 id="example">Hello world example</h2>

To get started with `graphql-tools` right away, run the [example from the Apollo Server docs](https://www.apollographql.com/docs/apollo-server/example.html).

<h2 id="apollo-server" title="Using with HTTP">Using GraphQL with HTTP</h2>

If you want to bind your JavaScript GraphQL schema to an HTTP server, we recommend using [Apollo Server](https://www.apollographql.com/docs/apollo-server/), which supports every popular Node HTTP server library including Express, Koa, Hapi, and more.

JavaScript GraphQL servers are often developed with `graphql-tools` and `apollo-server-express` together: One to write the schema and resolver code, and the other to connect it to a web server.

<h2 id="recommendations" title="GraphQL-first philosophy">The GraphQL-first philosophy</h2>

This package enables a specific workflow for developing a GraphQL server, where the GraphQL schema is the first thing you design, and acts as the contract between your frontend and backend. It's not necessarily for everyone, but it can be a great way to get a server up and running with a very clear separation of concerns. These concerns are aligned with Facebook's direction about the best way to use GraphQL, and our own findings after thinking about the best way to architect a JavaScript GraphQL API codebase.

1. **Use the GraphQL schema language.** The [official GraphQL documentation](http://graphql.org/learn/schema/) explains schema concepts using a concise and easy to read language. The [getting started guide](http://graphql.org/graphql-js/) for GraphQL.js now uses the schema to introduce new developers to GraphQL. `graphql-tools` enables you to use this language alongside with all of the features of GraphQL including resolvers, interfaces, custom scalars, and more, so that you can have a seamless flow from design to mocking to implementation. For a more complete overview of the benefits, check out Nick Nance's talk, [Managing GraphQL Development at Scale](https://www.youtube.com/watch?v=XOM8J4LaYFg).
2. **Separate business logic from the schema.** As Dan Schafer covered in his talk, [GraphQL at Facebook](https://medium.com/apollo-stack/graphql-at-facebook-by-dan-schafer-38d65ef075af#.jduhdwudr), it's a good idea to treat GraphQL as a thin API and routing layer. This means that your actual business logic, permissions, and other concerns should not be part of your GraphQL schema. For large apps, we suggest splitting your GraphQL server code into 4 components: Schema, Resolvers, Models, and Connectors, which each handle a specific part of the work. You can see this in action in the server part of our [GitHunt example app](https://github.com/apollostack/GitHunt-API/blob/master/api/schema.js).
3. **Use standard libraries for auth and other special concerns.** There's no need to reinvent the login process in GraphQL. Every server framework already has a wealth of technologies for auth, file uploads, and more. It's prudent to use those standard solutions even if your data is being served through a GraphQL endpoint, and it is okay to have non-GraphQL endpoints on your server when it's the most practical solution.

<h2 id="example">The GitHunt-API example</h2>

We have produced a complete example app that represents this model for constructing a small GraphQL API. [Check it out at apollostack/GitHunt-API on GitHub](https://github.com/apollostack/GitHunt-API).
