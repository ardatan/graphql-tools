---
title: "useExecutor (function in @graphql-tools/executor-envelop)"
sidebarTitle: "useExecutor"
description: "The useExecutor function exported by @graphql-tools/executor-envelop."
---

> **useExecutor**\<`TPluginContext`\>(`executor`, `opts?`): `Plugin`\<`TPluginContext`\> & [`ExecutorPluginExtras`](/docs/api/executors/envelop/src/interfaces/executorpluginextras)

Defined in: [packages/executors/envelop/src/index.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/envelop/src/index.ts#L25)

## Type Parameters

### TPluginContext

`TPluginContext` *extends* `Record`\<`string`, `any`\>

## Parameters

### executor

[`Executor`](/docs/api/utils/src/type-aliases/executor)

### opts?

`Partial`\<`IntrospectionOptions`\> & `GraphQLSchemaValidationOptions` & `ParseOptions` & `object`

## Returns

`Plugin`\<`TPluginContext`\> & [`ExecutorPluginExtras`](/docs/api/executors/envelop/src/interfaces/executorpluginextras)
