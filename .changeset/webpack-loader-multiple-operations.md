---
'@graphql-tools/webpack-loader': minor
'@graphql-tools/jest-transform': minor
---

`@graphql-tools/webpack-loader` (and `@graphql-tools/jest-transform`, which calls it) now accepts more than one GraphQL operation in the same file and exports each named operation, matching `graphql-tag/loader`.

A file with two mutations used to throw `GraphQL Webpack Loader allows only for one GraphQL Operation per file`, so this import failed in webpack and Jest:

```graphql
# menuMutations.graphql
mutation deleteMenuMutation {
  deleteMenu {
    ...MenuFields
  }
}

mutation upsertMenuMutation {
  upsertMenu {
    id
  }
}

fragment MenuFields on Menu {
  id
  name
}
```

```ts
import { deleteMenuMutation, upsertMenuMutation } from './menuMutations.graphql'
```

The default export is still the whole document. Each named export is that operation plus the fragments it uses. `deleteMenuMutation` includes `MenuFields`; `upsertMenuMutation` does not.

```ts
import menuMutations, {
  deleteMenuMutation,
  upsertMenuMutation,
} from './menuMutations.graphql'
```

A single named operation is also exported under its name. Unnamed operations are still allowed when the file has only one operation. If the file has more than one operation, each operation must be named.
