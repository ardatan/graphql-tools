---
id: merge-resolvers
title: Resolvers merging
sidebar_label: Resolvers merging
---

Resolvers are merged using deep-merge. Resolver implementations can be separated across multiple objects and then merged into a single `resolvers` object.

## Usage

Resolvers should be implemented as simple JS objects. Following our example, for the types we implemented
our resolvers should look like the following:

```js
// ./graphql/resolvers/clientResolver.js
module.exports = {
  Query: {
    clients: () => {},
    client: () => {},
  },
  Mutation: {
    addClient: () => {},
  },
  Client: {
    products: () => {},
  },
}

// ./graphql/resolvers/productResolver.js
module.exports = {
  Query: {
    products: () => {},
    product: () => {},
  },
  Product: {
    client: () => {},
  },
}
```

Just like your type definitions, you can choose to import files manually:

```js
// ./graphql/resolvers/index.js
const { mergeResolvers } = require('@graphql-tools/merge');
const clientResolver = require('./clientResolver');
const productResolver = require('./productResolver');

const resolvers = [
  clientResolver,
  productResolver,
];

module.exports mergeResolvers(resolvers);
```
Or automatically:

```js
// ./graphql/resolvers.js
const path = require('path');
const { mergeResolvers } = require('@graphql-tools/merge');
const { loadFiles } = require('@graphql-tools/load-files');

const resolversArray = loadFiles(path.join(__dirname, './resolvers'));

module.exports = mergeResolvers(resolversArray);
```

> Beware that `mergeResolvers` is simply merging plain Javascript objects together.
This means that you should be careful with Queries, Mutations or Subscriptions with naming conflicts.

You can also load files with specified extensions by setting the extensions option.
Only these values are supported now. `'.ts', '.js', '.gql', '.graphql', '.graphqls'`
```js
// ./graphql/resolvers.js
const path = require('path');
const { mergeResolvers } = require('@graphql-tools/merge');
const { loadFiles } = require('@graphql-tools/load-files');

const resolversArray = loadFiles(path.join(__dirname, './resolvers'), { extensions: ['.js'] });

module.exports = mergeResolvers(resolversArray);
```

**Optional: Automatic with Resolver Naming Convention**

If you would like to use the automated `fileLoader` approach _but_ would like complete
freedom over the structure of your resolver files, then simply use a resolver file naming
convention like, `[file].resolvers.js/ts`.

Then setup your `fileLoader` like so, and you're in business:

```js
// ./graphql/resolvers/index.js/ts
const path = require('path');
const { mergeResolvers } = require('@graphql-tools/merge');
const { loadFiles } = require('@graphql-tools/load-files');

const resolversArray = loadFiles(path.join(__dirname, "./**/*.resolvers.*"));
module.exports = mergeResolvers(resolversArray);
```
With this approach, you're free to structure resolver files as you see fit. Of course,
unique naming of Queries, Mutations and Subscriptions still applies!

Now you can structure by **function**...
```
+-- graphql
|   +-- resolvers
|   |   +-- author.resolvers.js/ts
|   |   +-- book.resolvers.js/ts
|   |   +-- index.ts  <<< Merges all `*.resolvers.*` files
```

Or by **type**...
```
+-- graphql
|   +-- entity
|   |   +-- author
|   |   |   +-- author.resolvers.js/ts
|   |   |   +-- ...
|   |   +-- book
|   |   |   +-- book.resolvers.js/ts
|   |   |   +-- ...
|   |   +-- index.ts <<< Merges all `*.resolvers.*` files
```
