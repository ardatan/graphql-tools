# @graphql-tools/merge

### Enumerations

- [CompareVal](/docs/api/enums/merge_src.CompareVal)

### Interfaces

- [Config](/docs/api/interfaces/merge_src.Config)
- [MergeResolversOptions](/docs/api/interfaces/merge_src.MergeResolversOptions)

### Type Aliases

- [CompareFn](merge_src#comparefn)
- [MergedResultMap](merge_src#mergedresultmap)
- [OnFieldTypeConflict](merge_src#onfieldtypeconflict)

### Variables

- [schemaDefSymbol](merge_src#schemadefsymbol)

### Functions

- [applyExtensions](merge_src#applyextensions)
- [defaultStringComparator](merge_src#defaultstringcomparator)
- [extractExtensionsFromSchema](merge_src#extractextensionsfromschema)
- [extractType](merge_src#extracttype)
- [isListTypeNode](merge_src#islisttypenode)
- [isNamedDefinitionNode](merge_src#isnameddefinitionnode)
- [isNonNullTypeNode](merge_src#isnonnulltypenode)
- [isSourceTypes](merge_src#issourcetypes)
- [isStringTypes](merge_src#isstringtypes)
- [isWrappingTypeNode](merge_src#iswrappingtypenode)
- [mergeArguments](merge_src#mergearguments)
- [mergeDirective](merge_src#mergedirective)
- [mergeDirectives](merge_src#mergedirectives)
- [mergeEnum](merge_src#mergeenum)
- [mergeEnumValues](merge_src#mergeenumvalues)
- [mergeExtensions](merge_src#mergeextensions)
- [mergeFields](merge_src#mergefields)
- [mergeGraphQLNodes](merge_src#mergegraphqlnodes)
- [mergeGraphQLTypes](merge_src#mergegraphqltypes)
- [mergeInputType](merge_src#mergeinputtype)
- [mergeInterface](merge_src#mergeinterface)
- [mergeNamedTypeArray](merge_src#mergenamedtypearray)
- [mergeResolvers](merge_src#mergeresolvers)
- [mergeScalar](merge_src#mergescalar)
- [mergeType](merge_src#mergetype)
- [mergeTypeDefs](merge_src#mergetypedefs)
- [mergeUnion](merge_src#mergeunion)
- [printTypeNode](merge_src#printtypenode)

## Type Aliases

### CompareFn

Ƭ **CompareFn**\<`T`>: (`a`: `T` \| `undefined`, `b`: `T` \| `undefined`) => `-1` \| `0` \| `1`

#### Type parameters

| Name |
| :--- |
| `T`  |

#### Type declaration

▸ (`a`, `b`): `-1` \| `0` \| `1`

##### Parameters

| Name | Type               |
| :--- | :----------------- |
| `a`  | `T` \| `undefined` |
| `b`  | `T` \| `undefined` |

##### Returns

`-1` \| `0` \| `1`

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:48](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L48)

---

### MergedResultMap

Ƭ **MergedResultMap**: `Record`\<`string`, [`NamedDefinitionNode`](utils_src#nameddefinitionnode)> &
\{ `SCHEMA_DEF_SYMBOL`: `SchemaDefinitionNode` \| `SchemaExtensionNode` }

#### Defined in

[packages/merge/src/typedefs-mergers/merge-nodes.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L21)

---

### OnFieldTypeConflict

Ƭ **OnFieldTypeConflict**: (`existingField`: `FieldDefNode`, `otherField`: `FieldDefNode`, `type`:
`NamedDefNode`, `ignoreNullability`: `boolean` \| `undefined`) => `FieldDefNode`

#### Type declaration

▸ (`existingField`, `otherField`, `type`, `ignoreNullability`): `FieldDefNode`

##### Parameters

| Name                | Type                     |
| :------------------ | :----------------------- |
| `existingField`     | `FieldDefNode`           |
| `otherField`        | `FieldDefNode`           |
| `type`              | `NamedDefNode`           |
| `ignoreNullability` | `boolean` \| `undefined` |

##### Returns

`FieldDefNode`

#### Defined in

[packages/merge/src/typedefs-mergers/fields.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/fields.ts#L23)

## Variables

### schemaDefSymbol

• `Const` **schemaDefSymbol**: `"SCHEMA_DEF_SYMBOL"`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-nodes.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L19)

## Functions

### applyExtensions

▸ **applyExtensions**(`schema`, `extensions`): `GraphQLSchema`

#### Parameters

| Name         | Type                                             |
| :----------- | :----------------------------------------------- |
| `schema`     | `GraphQLSchema`                                  |
| `extensions` | [`SchemaExtensions`](utils_src#schemaextensions) |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/merge/src/extensions.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L21)

---

### defaultStringComparator

▸ **defaultStringComparator**(`a`, `b`): [`CompareVal`](/docs/api/enums/merge_src.CompareVal)

#### Parameters

| Name | Type                    |
| :--- | :---------------------- |
| `a`  | `undefined` \| `string` |
| `b`  | `undefined` \| `string` |

#### Returns

[`CompareVal`](/docs/api/enums/merge_src.CompareVal)

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L50)

---

### extractExtensionsFromSchema

▸ **extractExtensionsFromSchema**(`schema`): [`SchemaExtensions`](utils_src#schemaextensions)

#### Parameters

| Name     | Type            |
| :------- | :-------------- |
| `schema` | `GraphQLSchema` |

#### Returns

[`SchemaExtensions`](utils_src#schemaextensions)

#### Defined in

[packages/utils/src/extractExtensionsFromSchema.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/extractExtensionsFromSchema.ts#L11)

---

### extractType

▸ **extractType**(`type`): `NamedTypeNode`

#### Parameters

| Name   | Type       |
| :----- | :--------- |
| `type` | `TypeNode` |

#### Returns

`NamedTypeNode`

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L11)

---

### isListTypeNode

▸ **isListTypeNode**(`type`): type is ListTypeNode

#### Parameters

| Name   | Type       |
| :----- | :--------- |
| `type` | `TypeNode` |

#### Returns

type is ListTypeNode

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L23)

---

### isNamedDefinitionNode

▸ **isNamedDefinitionNode**(`definitionNode`): definitionNode is NamedDefinitionNode

#### Parameters

| Name             | Type             |
| :--------------- | :--------------- |
| `definitionNode` | `DefinitionNode` |

#### Returns

definitionNode is NamedDefinitionNode

#### Defined in

[packages/merge/src/typedefs-mergers/merge-nodes.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L25)

---

### isNonNullTypeNode

▸ **isNonNullTypeNode**(`type`): type is NonNullTypeNode

#### Parameters

| Name   | Type       |
| :----- | :--------- |
| `type` | `TypeNode` |

#### Returns

type is NonNullTypeNode

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L27)

---

### isSourceTypes

▸ **isSourceTypes**(`types`): types is Source

#### Parameters

| Name    | Type  |
| :------ | :---- |
| `types` | `any` |

#### Returns

types is Source

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L7)

---

### isStringTypes

▸ **isStringTypes**(`types`): types is string

#### Parameters

| Name    | Type  |
| :------ | :---- |
| `types` | `any` |

#### Returns

types is string

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L3)

---

### isWrappingTypeNode

▸ **isWrappingTypeNode**(`type`): type is ListTypeNode \| NonNullTypeNode

#### Parameters

| Name   | Type       |
| :----- | :--------- |
| `type` | `TypeNode` |

#### Returns

type is ListTypeNode \| NonNullTypeNode

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L19)

---

### mergeArguments

▸ **mergeArguments**(`args1`, `args2`, `config?`): `InputValueDefinitionNode`[]

#### Parameters

| Name      | Type                                              |
| :-------- | :------------------------------------------------ |
| `args1`   | `InputValueDefinitionNode`[]                      |
| `args2`   | `InputValueDefinitionNode`[]                      |
| `config?` | [`Config`](/docs/api/interfaces/merge_src.Config) |

#### Returns

`InputValueDefinitionNode`[]

#### Defined in

[packages/merge/src/typedefs-mergers/arguments.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/arguments.ts#L5)

---

### mergeDirective

▸ **mergeDirective**(`node`, `existingNode?`): `DirectiveDefinitionNode`

#### Parameters

| Name            | Type                      |
| :-------------- | :------------------------ |
| `node`          | `DirectiveDefinitionNode` |
| `existingNode?` | `DirectiveDefinitionNode` |

#### Returns

`DirectiveDefinitionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/directives.ts:140](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/directives.ts#L140)

---

### mergeDirectives

▸ **mergeDirectives**(`d1?`, `d2?`, `config?`, `directives?`): `DirectiveNode`[]

#### Parameters

| Name          | Type                                              | Default value |
| :------------ | :------------------------------------------------ | :------------ |
| `d1`          | readonly `DirectiveNode`[]                        | `[]`          |
| `d2`          | readonly `DirectiveNode`[]                        | `[]`          |
| `config?`     | [`Config`](/docs/api/interfaces/merge_src.Config) | `undefined`   |
| `directives?` | `Record`\<`string`, `DirectiveDefinitionNode`>    | `undefined`   |

#### Returns

`DirectiveNode`[]

#### Defined in

[packages/merge/src/typedefs-mergers/directives.ts:86](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/directives.ts#L86)

---

### mergeEnum

▸ **mergeEnum**(`e1`, `e2`, `config?`, `directives?`): `EnumTypeDefinitionNode` \|
`EnumTypeExtensionNode`

#### Parameters

| Name          | Type                                                |
| :------------ | :-------------------------------------------------- |
| `e1`          | `EnumTypeDefinitionNode` \| `EnumTypeExtensionNode` |
| `e2`          | `EnumTypeDefinitionNode` \| `EnumTypeExtensionNode` |
| `config?`     | [`Config`](/docs/api/interfaces/merge_src.Config)   |
| `directives?` | `Record`\<`string`, `DirectiveDefinitionNode`>      |

#### Returns

`EnumTypeDefinitionNode` \| `EnumTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/enum.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/enum.ts#L11)

---

### mergeEnumValues

▸ **mergeEnumValues**(`first`, `second`, `config?`, `directives?`): `EnumValueDefinitionNode`[]

#### Parameters

| Name          | Type                                                |
| :------------ | :-------------------------------------------------- |
| `first`       | `undefined` \| readonly `EnumValueDefinitionNode`[] |
| `second`      | `undefined` \| readonly `EnumValueDefinitionNode`[] |
| `config?`     | [`Config`](/docs/api/interfaces/merge_src.Config)   |
| `directives?` | `Record`\<`string`, `DirectiveDefinitionNode`>      |

#### Returns

`EnumValueDefinitionNode`[]

#### Defined in

[packages/merge/src/typedefs-mergers/enum-values.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/enum-values.ts#L6)

---

### mergeExtensions

▸ **mergeExtensions**(`extensions`): [`SchemaExtensions`](utils_src#schemaextensions)

#### Parameters

| Name         | Type                                               |
| :----------- | :------------------------------------------------- |
| `extensions` | [`SchemaExtensions`](utils_src#schemaextensions)[] |

#### Returns

[`SchemaExtensions`](utils_src#schemaextensions)

#### Defined in

[packages/merge/src/extensions.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L6)

---

### mergeFields

▸ **mergeFields**<`T`\>(`type`, `f1`, `f2`, `config?`, `directives?`): `T`[]

#### Type parameters

| Name | Type                   |
| :--- | :--------------------- |
| `T`  | extends `FieldDefNode` |

#### Parameters

| Name          | Type                                              |
| :------------ | :------------------------------------------------ |
| `type`        | `Object`                                          |
| `type.name`   | `NameNode`                                        |
| `f1`          | `undefined` \| readonly `T`[]                     |
| `f2`          | `undefined` \| readonly `T`[]                     |
| `config?`     | [`Config`](/docs/api/interfaces/merge_src.Config) |
| `directives?` | `Record`\<`string`, `DirectiveDefinitionNode`>    |

#### Returns

`T`[]

#### Defined in

[packages/merge/src/typedefs-mergers/fields.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/fields.ts#L41)

---

### mergeGraphQLNodes

▸ **mergeGraphQLNodes**(`nodes`, `config?`, `directives?`):
[`MergedResultMap`](merge_src#mergedresultmap)

#### Parameters

| Name         | Type                                              |
| :----------- | :------------------------------------------------ |
| `nodes`      | readonly `DefinitionNode`[]                       |
| `config?`    | [`Config`](/docs/api/interfaces/merge_src.Config) |
| `directives` | `Record`\<`string`, `DirectiveDefinitionNode`>    |

#### Returns

[`MergedResultMap`](merge_src#mergedresultmap)

#### Defined in

[packages/merge/src/typedefs-mergers/merge-nodes.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L31)

---

### mergeGraphQLTypes

▸ **mergeGraphQLTypes**(`typeSource`, `config`): `DefinitionNode`[]

#### Parameters

| Name         | Type                                              |
| :----------- | :------------------------------------------------ |
| `typeSource` | [`TypeSource`](utils_src#typesource)              |
| `config`     | [`Config`](/docs/api/interfaces/merge_src.Config) |

#### Returns

`DefinitionNode`[]

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:198](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L198)

---

### mergeInputType

▸ **mergeInputType**(`node`, `existingNode`, `config?`, `directives?`):
`InputObjectTypeDefinitionNode` \| `InputObjectTypeExtensionNode`

#### Parameters

| Name           | Type                                                              |
| :------------- | :---------------------------------------------------------------- |
| `node`         | `InputObjectTypeDefinitionNode` \| `InputObjectTypeExtensionNode` |
| `existingNode` | `InputObjectTypeDefinitionNode` \| `InputObjectTypeExtensionNode` |
| `config?`      | [`Config`](/docs/api/interfaces/merge_src.Config)                 |
| `directives?`  | `Record`\<`string`, `DirectiveDefinitionNode`>                    |

#### Returns

`InputObjectTypeDefinitionNode` \| `InputObjectTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/input-type.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/input-type.ts#L12)

---

### mergeInterface

▸ **mergeInterface**(`node`, `existingNode`, `config?`, `directives?`):
`InterfaceTypeDefinitionNode` \| `InterfaceTypeExtensionNode`

#### Parameters

| Name           | Type                                                          |
| :------------- | :------------------------------------------------------------ |
| `node`         | `InterfaceTypeDefinitionNode` \| `InterfaceTypeExtensionNode` |
| `existingNode` | `InterfaceTypeDefinitionNode` \| `InterfaceTypeExtensionNode` |
| `config?`      | [`Config`](/docs/api/interfaces/merge_src.Config)             |
| `directives?`  | `Record`\<`string`, `DirectiveDefinitionNode`>                |

#### Returns

`InterfaceTypeDefinitionNode` \| `InterfaceTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/interface.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/interface.ts#L12)

---

### mergeNamedTypeArray

▸ **mergeNamedTypeArray**(`first?`, `second?`, `config?`): `NamedTypeNode`[]

#### Parameters

| Name     | Type                                              | Default value |
| :------- | :------------------------------------------------ | :------------ |
| `first`  | readonly `NamedTypeNode`[]                        | `[]`          |
| `second` | readonly `NamedTypeNode`[]                        | `[]`          |
| `config` | [`Config`](/docs/api/interfaces/merge_src.Config) | `{}`          |

#### Returns

`NamedTypeNode`[]

#### Defined in

[packages/merge/src/typedefs-mergers/merge-named-type-array.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-named-type-array.ts#L9)

---

### mergeResolvers

▸ **mergeResolvers**<`TSource`, `TContext`\>(`resolversDefinitions`, `options?`):
[`IResolvers`](utils_src#iresolvers)\<`TSource`, `TContext`>

Deep merges multiple resolver definition objects into a single definition.

#### Type parameters

| Name       |
| :--------- |
| `TSource`  |
| `TContext` |

#### Parameters

| Name                   | Type                                                                                                                                                                                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resolversDefinitions` | `undefined` \| `null` \| [`IResolvers`](utils_src#iresolvers)\<`TSource`, `TContext`> \| [`Maybe`](utils_src#maybe)\<[`IResolvers`](utils_src#iresolvers)\<`TSource`, `TContext`>>[] | Resolver definitions to be merged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `options?`             | [`MergeResolversOptions`](/docs/api/interfaces/merge_src.MergeResolversOptions)                                                                                                      | Additional options `js const { mergeResolvers } = require('@graphql-tools/merge'); const clientResolver = require('./clientResolver'); const productResolver = require('./productResolver'); const resolvers = mergeResolvers([ clientResolver, productResolver, ]); ` If you don't want to manually create the array of resolver objects, you can also use this function along with loadFiles: `js const path = require('path'); const { mergeResolvers } = require('@graphql-tools/merge'); const { loadFilesSync } = require('@graphql-tools/load-files'); const resolversArray = loadFilesSync(path.join(__dirname, './resolvers')); const resolvers = mergeResolvers(resolversArray) ` |

#### Returns

[`IResolvers`](utils_src#iresolvers)\<`TSource`, `TContext`>

#### Defined in

[packages/merge/src/merge-resolvers.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-resolvers.ts#L39)

---

### mergeScalar

▸ **mergeScalar**(`node`, `existingNode`, `config?`, `directives?`): `ScalarTypeDefinitionNode` \|
`ScalarTypeExtensionNode`

#### Parameters

| Name           | Type                                                    |
| :------------- | :------------------------------------------------------ |
| `node`         | `ScalarTypeDefinitionNode` \| `ScalarTypeExtensionNode` |
| `existingNode` | `ScalarTypeDefinitionNode` \| `ScalarTypeExtensionNode` |
| `config?`      | [`Config`](/docs/api/interfaces/merge_src.Config)       |
| `directives?`  | `Record`\<`string`, `DirectiveDefinitionNode`>          |

#### Returns

`ScalarTypeDefinitionNode` \| `ScalarTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/scalar.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/scalar.ts#L10)

---

### mergeType

▸ **mergeType**(`node`, `existingNode`, `config?`, `directives?`): `ObjectTypeDefinitionNode` \|
`ObjectTypeExtensionNode`

#### Parameters

| Name           | Type                                                    |
| :------------- | :------------------------------------------------------ |
| `node`         | `ObjectTypeDefinitionNode` \| `ObjectTypeExtensionNode` |
| `existingNode` | `ObjectTypeDefinitionNode` \| `ObjectTypeExtensionNode` |
| `config?`      | [`Config`](/docs/api/interfaces/merge_src.Config)       |
| `directives?`  | `Record`\<`string`, `DirectiveDefinitionNode`>          |

#### Returns

`ObjectTypeDefinitionNode` \| `ObjectTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/type.ts:12](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/type.ts#L12)

---

### mergeTypeDefs

▸ **mergeTypeDefs**(`typeSource`): `DocumentNode`

Merges multiple type definitions into a single `DocumentNode`

#### Parameters

| Name         | Type                                 |
| :----------- | :----------------------------------- |
| `typeSource` | [`TypeSource`](utils_src#typesource) |

#### Returns

`DocumentNode`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L103)

▸ **mergeTypeDefs**(`typeSource`, `config?`): `string`

#### Parameters

| Name         | Type                                                                                               |
| :----------- | :------------------------------------------------------------------------------------------------- |
| `typeSource` | [`TypeSource`](utils_src#typesource)                                                               |
| `config?`    | `Partial`\<[`Config`](/docs/api/interfaces/merge_src.Config)> & \{ `commentDescriptions`: `true` } |

#### Returns

`string`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:104](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L104)

▸ **mergeTypeDefs**(`typeSource`, `config?`): `DocumentNode`

#### Parameters

| Name         | Type                                                                                            |
| :----------- | :---------------------------------------------------------------------------------------------- |
| `typeSource` | [`TypeSource`](utils_src#typesource)                                                            |
| `config?`    | `Omit`\<`Partial`\<[`Config`](/docs/api/interfaces/merge_src.Config)>, `"commentDescriptions"`> |

#### Returns

`DocumentNode`

#### Defined in

[packages/merge/src/typedefs-mergers/merge-typedefs.ts:108](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L108)

---

### mergeUnion

▸ **mergeUnion**(`first`, `second`, `config?`, `directives?`): `UnionTypeDefinitionNode` \|
`UnionTypeExtensionNode`

#### Parameters

| Name          | Type                                                  |
| :------------ | :---------------------------------------------------- |
| `first`       | `UnionTypeDefinitionNode` \| `UnionTypeExtensionNode` |
| `second`      | `UnionTypeDefinitionNode` \| `UnionTypeExtensionNode` |
| `config?`     | [`Config`](/docs/api/interfaces/merge_src.Config)     |
| `directives?` | `Record`\<`string`, `DirectiveDefinitionNode`>        |

#### Returns

`UnionTypeDefinitionNode` \| `UnionTypeExtensionNode`

#### Defined in

[packages/merge/src/typedefs-mergers/union.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/union.ts#L11)

---

### printTypeNode

▸ **printTypeNode**(`type`): `string`

#### Parameters

| Name   | Type       |
| :----- | :--------- |
| `type` | `TypeNode` |

#### Returns

`string`

#### Defined in

[packages/merge/src/typedefs-mergers/utils.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L31)
