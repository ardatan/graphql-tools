---
'@graphql-tools/executor': major
'@graphql-tools/utils': minor
---

Upgrade to non-duplicating Incremental Delivery format

## Description

GraphQL Incremental Delivery is moving to a [new response format without duplication](https://github.com/graphql/defer-stream-wg/discussions/69).

This PR updates the executor within graphql-tools to avoid any duplication of fields as per the new format, a BREAKING CHANGE, released in graphql-js `v17.0.0-alpha.3`. The original version of incremental delivery was released in graphql-js `v17.0.0-alpha.2`.

The new format also includes new `pending` and `completed` entries where the `pending` entries assign `ids` to `defer` and `stream` entries, and the `completed` entries are sent as deferred fragments or streams complete. In the new format, the `path` and `label` are only sent along with the `id` within the `pending` entries. Also, incremental errors (i.e. errors that bubble up to a position that has already been sent) are sent within the `errors` field on `completed` entries, rather than as `incremental` entries with `data` or `items` set to `null`. The missing `path` and `label` fields and different mechanism for reporting incremental errors are also a BREAKING CHANGE.

Along with the new format, the GraphQL Working Group has also decided to disable incremental delivery support for subscriptions (1) to gather more information about use cases and (2) explore how to interleaving the incremental response streams generated from different source events into one overall subscription response stream. This is also a BREAKING CHANGE.

Library users can explicitly opt in to the older format by call `execute` with the following option:

```ts
const result = await execute({
  ...,
  incrementalPreset: 'v17.0.0-alpha.2',
});
```

The default value for `incrementalPreset` when omitted is `'v17.0.0-alpha.3'`, which enables the new behaviors described above. The new behaviors can also be disabled granularly as follows:

```ts
const result = await execute({
  ...,
  deferWithoutDuplication: false,
  useIncrementalNotifications: false,
  errorOnSubscriptionWithIncrementalDelivery: false,
});
```

Setting `deferWithoutDuplication` to `false` will re-enable deduplication according to the older format.
Setting `useIncrementalNotifications` to `false` will (1) omit the `pending` entries, (2) send `path` and `label` on every `incremental` entry, (3) omit `completed` entries, and (4) send incremental errors within `incremental` entries along with a `data` or `items` field set to `null`.
Setting `errorOnSubscriptionWithIncrementalDelivery` to `false` will re-enable the use of incremental delivery with subscriptions.
```
