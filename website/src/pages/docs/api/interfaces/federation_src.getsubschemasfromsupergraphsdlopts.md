[graphql-tools-monorepo](../README) / [federation/src](../modules/federation_src) /
GetSubschemasFromSupergraphSdlOpts

# Interface: GetSubschemasFromSupergraphSdlOpts

[federation/src](../modules/federation_src).GetSubschemasFromSupergraphSdlOpts

## Table of contents

### Properties

- [batch](federation_src.GetSubschemasFromSupergraphSdlOpts#batch)
- [onExecutor](federation_src.GetSubschemasFromSupergraphSdlOpts#onexecutor)
- [supergraphSdl](federation_src.GetSubschemasFromSupergraphSdlOpts#supergraphsdl)

## Properties

### batch

• `Optional` **batch**: `boolean`

#### Defined in

[packages/federation/src/supergraph.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/supergraph.ts#L32)

---

### onExecutor

• `Optional` **onExecutor**: (`opts`: \{ `endpoint`: `string` ; `subgraphName`: `string` }) =>
[`Executor`](../modules/utils_src#executor)

#### Type declaration

▸ (`opts`): [`Executor`](../modules/utils_src#executor)

##### Parameters

| Name                | Type     |
| :------------------ | :------- |
| `opts`              | `Object` |
| `opts.endpoint`     | `string` |
| `opts.subgraphName` | `string` |

##### Returns

[`Executor`](../modules/utils_src#executor)

#### Defined in

[packages/federation/src/supergraph.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/supergraph.ts#L31)

---

### supergraphSdl

• **supergraphSdl**: `string` \| `DocumentNode`

#### Defined in

[packages/federation/src/supergraph.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/federation/src/supergraph.ts#L30)
