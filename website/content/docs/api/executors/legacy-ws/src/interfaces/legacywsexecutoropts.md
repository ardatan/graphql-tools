---
title: "LegacyWSExecutorOpts"
description: "The LegacyWSExecutorOpts interface exported by @graphql-tools/executor-legacy-ws."
---

Defined in: [packages/executors/legacy-ws/src/index.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/legacy-ws/src/index.ts#L22)

## Properties

### connectionParams?

> `optional` **connectionParams?**: `Record`\<`string`, `unknown`\> \| (() => `Record`\<`string`, `unknown`\>)

Defined in: [packages/executors/legacy-ws/src/index.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/legacy-ws/src/index.ts#L23)

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `any`\>

Defined in: [packages/executors/legacy-ws/src/index.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/legacy-ws/src/index.ts#L24)

***

### rejectUnauthorized?

> `optional` **rejectUnauthorized?**: `boolean`

Defined in: [packages/executors/legacy-ws/src/index.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/legacy-ws/src/index.ts#L30)

Whether to reject unauthorized TLS certificates when connecting over `wss://`.
Defaults to `true`. Set to `false` only for trusted environments that use
self-signed certificates (for example local development).
