---
'@graphql-tools/utils': minor
---

Add new `withState` function. This plugin utility helps developer to keep track of data across
hooks.

The utils adds a `state` field to all hook payloads. Depending on the hook, you will have access to
a stable context private to your plugin.

- `forRequest` for a context linked to HTTP request (Yoga and Hive Gateway)
- `forOperation` for a context linked to GraphQL operation (Envelop, Yoga and Hive Gateway)
- `forSubgraphExecution` for a context linked to the subgraph execution (Hive Gateway)

Under the hood, those states are kept in memory using `WeakMap`, which avoid any memory leaks.

```ts
import { defineConfig, GatewayPlugin } from '@graphql-hive/gateway'
import { withState } from '@graphql-tools/utils'

export const myPlugin = withState<GatewayPlugin, { user: User }, { permissions: Permissions }>({
  async onRequestParse({ request, state }) {
    state.forRequest.user = await getUserForRequest(request)
  },

  onParse:
    ({ state }) =>
    ({ result }) => {
      const user = state.forRequest.user
      if (isDocument(result)) {
        state.forOperation.permissions = getPermissionsForDocument(result, user)
      }
    },

  onValidate({ state, params: { documentAST } }) {
    const permissions = state.forOperation.permissions
    checkForPermissions(permissions)
  }
})
```
