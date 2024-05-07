---
"@graphql-tools/delegate": patch
"@graphql-tools/stitch": patch
---

Debugging the delegation plan;

After you enable the environment variable, `EXPOSE_DELEGATION_PLAN`, you can see the delegation plan in the console. This can be useful for debugging and understanding how the delegation works.

Also you can pass a different logger to it by using `logFnForContext` map from `@graphql-tools/delegate` package.

```ts
import { logFnForContext } from '@graphql-tools/delegate';
logFnForContext.set(MyGraphQLContext, console.log);
```

You can also add a `contextId` for that specific gateway request by using `contextIdMap` map from `@graphql-tools/delegate` package.

```ts
import { contextIdMap } from '@graphql-tools/delegate';
contextIdMap.set(MyGraphQLContext, 'my-request-id');
```

If you want to use those information instead of logging, you can get them by using the `context` object like below;

```ts
import { delegationPlanInfosByContext } from '@graphql-tools/delegate';
const delegationPlanInfos = delegationPlanInfosByContext.get(context);
```

