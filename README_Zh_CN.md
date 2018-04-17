# GraphQL-tools: 生成和mock GraphQL.js schemas

[![npm version](https://badge.fury.io/js/graphql-tools.svg)](https://badge.fury.io/js/graphql-tools)
[![Build Status](https://travis-ci.org/apollographql/graphql-tools.svg?branch=master)](https://travis-ci.org/apollographql/graphql-tools)
[![Coverage Status](https://coveralls.io/repos/github/apollographql/graphql-tools/badge.svg?branch=master)](https://coveralls.io/github/apollographql/graphql-tools?branch=master)
[![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

这个包提供了一些有用的方法来创建GraphQL schema:

1. 使用GraphQL模式语言生成一个完全支持解析器[生成一个schema](https://www.apollographql.com/docs/graphql-tools/generate-schema.html)，接口，联合和自定义标量的模式。生成的模式与[GraphQL.js](https://github.com/graphql/graphql-js)完全兼容。

2. 细粒度的[Mock你的GraphQL API](https://www.apollographql.com/docs/graphql-tools/mocking.html)
3. 自动[拼接多个schema](https://www.apollographql.com/docs/graphql-tools/schema-stitching.html)到一个更大的API

## 文档

[阅读文档](https://www.apollographql.com/docs/graphql-tools/)

## 绑定到HTTP服务器

如果您想要将JavaScript GraphQL模式绑定到HTTP服务器，我们推荐使用[Apollo Server](https://github.com/apollographql/apollo-server/)，它支持包括Express，Koa，Hapi等在内的所有流行的Node HTTP服务器库。

JavaScript GraphQL服务器通常使用`graphql-tools`和`apollo-server-express`一起开发：一个用于编写架构和解析器代码，另一个用于将其连接到Web服务器。

## 例子

[在Launchpad上查看和编辑demo](https://launchpad.graphql.com/1jzxrj179)

在使用`graphql-tools`时，您可以使用GraphQL类型的语言字符串来描述模式

```js

const typeDefs = `
type Author {
  id: ID! # the ! means that every author object _must_ have an id
  firstName: String
  lastName: String
  """
  the list of Posts by this author
  """
  posts: [Post]
}

type Post {
  id: ID!
  title: String
  author: Author
  votes: Int
}

# the schema allows the following query:
type Query {
  posts: [Post]
}

# this schema allows the following mutation:
type Mutation {
  upvotePost (
    postId: ID!
  ): Post
}

# we need to tell the server which types represent the root query
# and root mutation types. We call them RootQuery and RootMutation by convention.
schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefs;
```

然后，将解析器定义为将类型和字段名称映射到解析器函数的嵌套对象：

```js
const resolvers = {
  Query: {
    posts() {
      return posts;
    },
  },
  Mutation: {
    upvotePost(_, { postId }) {
      const post = find(posts, { id: postId });
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },
  Author: {
    posts(author) {
      return filter(posts, { authorId: author.id });
    },
  },
  Post: {
    author(post) {
      return find(authors, { id: post.authorId });
    },
  },
};

export default resolvers;
```

最后, schema和resolver使用`makeExecutableSchema`进行组合：

```js
import { makeExecutableSchema } from 'graphql-tools';

const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
```

此示例在一个字符串中包含整个类型定义，在一个文件中包含所有resolvers，但您可以将多个文件和对象中的类型和resolvers组合在一起，如[模块化schema](https://www.apollographql.com/docs/graphql-tools/generate-schema.html#modularizing)的模式部分所述。

