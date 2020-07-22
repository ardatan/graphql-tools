---
id: "_wrap_src_index_.imakeremoteexecutableschemaoptions"
title: "IMakeRemoteExecutableSchemaOptions"
sidebar_label: "IMakeRemoteExecutableSchemaOptions"
---

## Hierarchy

* **IMakeRemoteExecutableSchemaOptions**

## Index

### Properties

* [buildSchemaOptions](_wrap_src_index_.imakeremoteexecutableschemaoptions.md#optional-buildschemaoptions)
* [createResolver](_wrap_src_index_.imakeremoteexecutableschemaoptions.md#optional-createresolver)
* [executor](_wrap_src_index_.imakeremoteexecutableschemaoptions.md#optional-executor)
* [schema](_wrap_src_index_.imakeremoteexecutableschemaoptions.md#schema)
* [subscriber](_wrap_src_index_.imakeremoteexecutableschemaoptions.md#optional-subscriber)

## Properties

### `Optional` buildSchemaOptions

• **buildSchemaOptions**? : *BuildSchemaOptions*

*Defined in [packages/wrap/src/types.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L23)*

___

### `Optional` createResolver

• **createResolver**? : *function*

*Defined in [packages/wrap/src/types.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L22)*

#### Type declaration:

▸ (`executor`: Executor, `subscriber`: Subscriber): *GraphQLFieldResolver‹any, any›*

**Parameters:**

Name | Type |
------ | ------ |
`executor` | Executor |
`subscriber` | Subscriber |

___

### `Optional` executor

• **executor**? : *Executor*

*Defined in [packages/wrap/src/types.ts:20](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L20)*

___

###  schema

• **schema**: *GraphQLSchema | string*

*Defined in [packages/wrap/src/types.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L19)*

___

### `Optional` subscriber

• **subscriber**? : *Subscriber*

*Defined in [packages/wrap/src/types.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L21)*
