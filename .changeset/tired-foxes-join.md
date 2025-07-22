---
'@graphql-tools/graphql-file-loader': minor
'@graphql-tools/import': minor
---

GraphQL schemas in large projects, especially monorepos, suffer from fragile and verbose relative import paths that become difficult to maintain as projects grow. This change brings TypeScript's popular [`tsconfig.json#paths`](https://www.typescriptlang.org/tsconfig/#paths) aliasing syntax to GraphQL imports, enabling clean, maintainable import statements across your GraphQL schema files.

**Before** - Brittle relative imports:
```graphql
#import "../../../shared/models/User.graphql"
#import "../../../../common/types/Product.graphql"
```

**After** - Clean, semantic aliases:
```graphql
#import "@models/User.graphql"
#import "@types/Product.graphql"
```

**Configuration Example**
```ts
{
  mappings: {
    '@models/*': path.join(__dirname, './models/*'),
    '@types/*': path.join(__dirname, './shared/types/*'),
  }
}
```

This change is introduced in a backwards compatible way to ensure no existing use cases are broken while using familiar patterns to typescript developers for structuring import aliases.
