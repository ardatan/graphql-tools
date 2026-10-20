---
'@graphql-tools/utils': patch
---

`INCREMENTAL_DELIVERY_SPECS` is the shared HTTP contract for `incrementalSpec`. Each row maps an Accept / Content-Type parameter (`deferSpec=20220824`, `incrementalSpec=v0.2`, ...) to the executor payload id (`'v0.1'` | `'v0.2'`).

GraphQL Yoga, Hive Gateway, HTTP executors, and other servers should look up this table instead of hardcoding spec strings. When a later incremental spec ships, the work stays in graphql-tools: add a row here and an executor publisher. Consumers bump `@graphql-tools/utils` / `@graphql-tools/executor`. Accept negotiation, Content-Type echo, and 406 for unknown spec params keep working without a Yoga / Gateway / executor-http patch for the new identifier.

Unknown values for a registered parameter name stay unsupported (HTTP 406). Helpers: `lookupIncrementalDeliverySpec`, `getMultipartContentType`, `getDefaultIncrementalDeliverySpec`, `getIncrementalSpecParameterNames`.
