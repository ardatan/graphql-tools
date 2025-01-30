[graphql-tools-monorepo](../README) / [schema/src](../modules/schema_src) / GraphQLSchemaWithContext

# Interface: GraphQLSchemaWithContext<TContext\>

[schema/src](../modules/schema_src).GraphQLSchemaWithContext

## Type parameters

| Name       |
| :--------- |
| `TContext` |

## Hierarchy

- `GraphQLSchema`

  ↳ **`GraphQLSchemaWithContext`**

## Table of contents

### Properties

- [\_\_context](schema_src.GraphQLSchemaWithContext#__context)
- [\_\_validationErrors](schema_src.GraphQLSchemaWithContext#__validationerrors)
- [astNode](schema_src.GraphQLSchemaWithContext#astnode)
- [description](schema_src.GraphQLSchemaWithContext#description)
- [extensionASTNodes](schema_src.GraphQLSchemaWithContext#extensionastnodes)
- [extensions](schema_src.GraphQLSchemaWithContext#extensions)

### Accessors

- [[toStringTag]](schema_src.GraphQLSchemaWithContext#[tostringtag])

### Methods

- [getDirective](schema_src.GraphQLSchemaWithContext#getdirective)
- [getDirectives](schema_src.GraphQLSchemaWithContext#getdirectives)
- [getImplementations](schema_src.GraphQLSchemaWithContext#getimplementations)
- [getMutationType](schema_src.GraphQLSchemaWithContext#getmutationtype)
- [getPossibleTypes](schema_src.GraphQLSchemaWithContext#getpossibletypes)
- [getQueryType](schema_src.GraphQLSchemaWithContext#getquerytype)
- [getRootType](schema_src.GraphQLSchemaWithContext#getroottype)
- [getSubscriptionType](schema_src.GraphQLSchemaWithContext#getsubscriptiontype)
- [getType](schema_src.GraphQLSchemaWithContext#gettype)
- [getTypeMap](schema_src.GraphQLSchemaWithContext#gettypemap)
- [isSubType](schema_src.GraphQLSchemaWithContext#issubtype)
- [toConfig](schema_src.GraphQLSchemaWithContext#toconfig)

## Properties

### \_\_context

• `Optional` **\_\_context**: `TContext`

#### Defined in

[packages/schema/src/types.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L11)

---

### \_\_validationErrors

• **\_\_validationErrors**: `Maybe`\<readonly `GraphQLError`[]>

#### Inherited from

GraphQLSchema.\_\_validationErrors

#### Defined in

node_modules/graphql/type/schema.d.ts:106

---

### astNode

• **astNode**: `Maybe`\<`SchemaDefinitionNode`>

#### Inherited from

GraphQLSchema.astNode

#### Defined in

node_modules/graphql/type/schema.d.ts:104

---

### description

• **description**: `Maybe`\<`string`>

#### Inherited from

GraphQLSchema.description

#### Defined in

node_modules/graphql/type/schema.d.ts:102

---

### extensionASTNodes

• **extensionASTNodes**: readonly `SchemaExtensionNode`[]

#### Inherited from

GraphQLSchema.extensionASTNodes

#### Defined in

node_modules/graphql/type/schema.d.ts:105

---

### extensions

• **extensions**: `Readonly`\<`GraphQLSchemaExtensions`>

#### Inherited from

GraphQLSchema.extensions

#### Defined in

node_modules/graphql/type/schema.d.ts:103

## Accessors

### [toStringTag]

• `get` **[toStringTag]**(): `string`

#### Returns

`string`

#### Inherited from

GraphQLSchema.[toStringTag]

#### Defined in

node_modules/graphql/type/schema.d.ts:115

## Methods

### getDirective

▸ **getDirective**(`name`): `Maybe`\<`GraphQLDirective`>

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `name` | `string` |

#### Returns

`Maybe`\<`GraphQLDirective`>

#### Inherited from

GraphQLSchema.getDirective

#### Defined in

node_modules/graphql/type/schema.d.ts:134

---

### getDirectives

▸ **getDirectives**(): readonly `GraphQLDirective`[]

#### Returns

readonly `GraphQLDirective`[]

#### Inherited from

GraphQLSchema.getDirectives

#### Defined in

node_modules/graphql/type/schema.d.ts:133

---

### getImplementations

▸ **getImplementations**(`interfaceType`): `Object`

#### Parameters

| Name            | Type                   |
| :-------------- | :--------------------- |
| `interfaceType` | `GraphQLInterfaceType` |

#### Returns

`Object`

| Name         | Type                                          |
| :----------- | :-------------------------------------------- |
| `interfaces` | readonly `GraphQLInterfaceType`[]             |
| `objects`    | readonly `GraphQLObjectType`\<`any`, `any`>[] |

#### Inherited from

GraphQLSchema.getImplementations

#### Defined in

node_modules/graphql/type/schema.d.ts:125

---

### getMutationType

▸ **getMutationType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Inherited from

GraphQLSchema.getMutationType

#### Defined in

node_modules/graphql/type/schema.d.ts:117

---

### getPossibleTypes

▸ **getPossibleTypes**(`abstractType`): readonly `GraphQLObjectType`\<`any`, `any`>[]

#### Parameters

| Name           | Type                  |
| :------------- | :-------------------- |
| `abstractType` | `GraphQLAbstractType` |

#### Returns

readonly `GraphQLObjectType`\<`any`, `any`>[]

#### Inherited from

GraphQLSchema.getPossibleTypes

#### Defined in

node_modules/graphql/type/schema.d.ts:122

---

### getQueryType

▸ **getQueryType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Inherited from

GraphQLSchema.getQueryType

#### Defined in

node_modules/graphql/type/schema.d.ts:116

---

### getRootType

▸ **getRootType**(`operation`): `Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Parameters

| Name        | Type                |
| :---------- | :------------------ |
| `operation` | `OperationTypeNode` |

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Inherited from

GraphQLSchema.getRootType

#### Defined in

node_modules/graphql/type/schema.d.ts:119

---

### getSubscriptionType

▸ **getSubscriptionType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`>>

#### Inherited from

GraphQLSchema.getSubscriptionType

#### Defined in

node_modules/graphql/type/schema.d.ts:118

---

### getType

▸ **getType**(`name`): `undefined` \| `GraphQLNamedType`

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `name` | `string` |

#### Returns

`undefined` \| `GraphQLNamedType`

#### Inherited from

GraphQLSchema.getType

#### Defined in

node_modules/graphql/type/schema.d.ts:121

---

### getTypeMap

▸ **getTypeMap**(): `TypeMap`

#### Returns

`TypeMap`

#### Inherited from

GraphQLSchema.getTypeMap

#### Defined in

node_modules/graphql/type/schema.d.ts:120

---

### isSubType

▸ **isSubType**(`abstractType`, `maybeSubType`): `boolean`

#### Parameters

| Name           | Type                                                         |
| :------------- | :----------------------------------------------------------- |
| `abstractType` | `GraphQLAbstractType`                                        |
| `maybeSubType` | `GraphQLInterfaceType` \| `GraphQLObjectType`\<`any`, `any`> |

#### Returns

`boolean`

#### Inherited from

GraphQLSchema.isSubType

#### Defined in

node_modules/graphql/type/schema.d.ts:129

---

### toConfig

▸ **toConfig**(): `GraphQLSchemaNormalizedConfig`

#### Returns

`GraphQLSchemaNormalizedConfig`

#### Inherited from

GraphQLSchema.toConfig

#### Defined in

node_modules/graphql/type/schema.d.ts:135
