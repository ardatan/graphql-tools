---
title: "registerAbortSignalListener"
description: "The registerAbortSignalListener function exported by @graphql-tools/utils."
---

> **registerAbortSignalListener**(`signal`, `listener`): `void`

Defined in: [packages/utils/src/registerAbortSignalListener.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/registerAbortSignalListener.ts#L26)

Register an AbortSignal handler for a signal.
This helper function mainly exists to work around the
"possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit."
warning occuring on Node.js

## Parameters

### signal

`AbortSignal`

### listener

() => `void`

## Returns

`void`
