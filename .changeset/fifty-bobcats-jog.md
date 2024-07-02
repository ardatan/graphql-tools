---
'@graphql-tools/executor': major
'@graphql-tools/utils': minor
---

Upgrade to non-duplicating Incremental Delivery format

## Description

GraphQL Incremental Delivery is moving to a [new response format without duplication](https://github.com/graphql/defer-stream-wg/discussions/69).

This PR updates the executor within graphql-tools to follow the new format, a BREAKING CHANGE.

Incremental Delivery has now been disabled for subscriptions, also a BREAKING CHANGE. The GraphQL Working Group has decided to disable incremental delivery support for subscriptions (1) to gather more information about use cases and (2) explore how to interleaving the incremental response streams generated from different source events into one overall subscription response stream.
