---
'@graphql-tools/utils': patch
---

`INCREMENTAL_DELIVERY_SPECS` is the shared HTTP contract for `incrementalSpec`. Each row maps an Accept / Content-Type parameter (`deferSpec=20220824`, `incrementalSpec=v0.2`, ...) to the executor payload id (`'v0.1'` | `'v0.2'`). GraphQL Yoga, HTTP executors, and other servers should look up this table instead of hardcoding spec strings. A later incremental spec is a new row here plus an executor publisher; unknown values for a registered parameter name stay unsupported (HTTP 406). Helpers: `lookupIncrementalDeliverySpec`, `getMultipartContentType`, `getDefaultIncrementalDeliverySpec`, `getIncrementalSpecParameterNames`.
