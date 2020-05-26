
## Loaders
There are a lot of loaders that load your schemas and documents from different sources. You need to provide those loaders under `loaders` parameter like below;

### GraphQL File Loader
This loader loads your GraphQLSchema from `.graphql` files like below;

```ts
// schema is `GraphQLSchema` instance
const schema = await loadSchema('schema.graphql', {  // load from a single schema file
    loaders: [
        new GraphQLFileLoader()
    ]
});

// You can add resolvers to that schema
const schemaWithResolvers = addResolversToSchema({
  schema,
  resolvers: {
    Query: {...}
  }
});
```

This loader also supports glob pattern;
```ts
const schema = await loadSchema('graphql/**/*.graphql', {  // load files and merge them into a single schema object
    loaders: [
        new GraphQLFileLoader()
    ]
});
```

If you use `loadDocuments`, it gives you an array of document source objects;
```ts
const documents = await loadSchema('graphql/**/*.graphql', {  // load files and merge them into a single schema object
    loaders: [
        new GraphQLFileLoader()
    ]
});
```

> This loader only supports Node environment because it relies on File System of your platform.

### JSON File Loader
This loader handles schema introspection and document nodes in `.json` files.

Introspection is handled in the example below;
```ts
const schema = await loadSchema('schema-introspection.json', {
  loaders: [
    new JsonFileLoader(),
  ]
});

// Mocked non-executable schema generated from an introspection
const mockedSchema = addMocksToSchema({ schema });
```

This loader handles `json` files if they represent `DocumentNode`, and returns an array of document sources.
```ts
const documents = await loadDocuments('**/*-document.json', {
  loaders: [
    new JsonFileLoader(),
  ]
});
```

> This loader only supports Node environment because it relies on File System of your platform.

### Code File Loader
This loader extracts GraphQL SDL string, exported `GraphQLSchema` and `DocumentNode` from TypeScript and JavaScript code files.
Let's say you have the following code file;

```ts
const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      username
      age
    }
  }
`;
```

And the following code will extract `Me` query operation from that code file without executing it using [GraphQL Tag Pluck](/docs/graphql-tag-pluck). It understands `/* GraphQL */` magic comment and `gql` literals. You can configure [GraphQL Tag Pluck](/docs/graphql-tag-pluck) using `pluckConfig`.

```ts
import { loadDocuments } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';

const documents = await loadDocuments('./src/**/graphql/*.ts', {
  loaders:[
    new CodeFileLoader()
  ],
  pluckConfig: {
    ...
  }
})
```

You can also load your schema from code files like below;

```ts
// typeDefs.ts
export const typeDefs = /* GraphQL */`
  type Query {
    foo: String
  }
`
// or schema.ts
export const schema = new GraphQLSchema(...);
```

> This loader only supports Node environment because it relies on File System of your platform.

### URL Loader
This loader generates (a fully executable remote schema using @graphql-tools/wrap)[/docs/remote-schema] from a URL endpoint.

```ts
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlFileLoader(),
  ]
});
```

You can provide custom headers, HTTP method and custom W3C fetch method.

```ts
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlFileLoader(),
  ],
  headers: {
    Accept: 'application/json',
  },
  method: 'POST',
  fetch: myFetch,
});
```

> This loader supports both browser and node environments.

In browser this remote schema can be called using vanilla GraphQL-js and act like a simple GraphQL client.
```ts
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlFileLoader(),
  ]
});

const response = await graphql(schema, /* GraphQL */`
  {
    foo {
      bar {
        baz
      }
    }
  }
`);

console.log(response);
```


