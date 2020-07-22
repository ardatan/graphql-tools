---
id: "wrap"
title: "@graphql-tools/wrap"
sidebar_label: "wrap"
---

### Classes

* [ExtendSchema](/docs/api/classes/_wrap_src_index_.extendschema)
* [ExtractField](/docs/api/classes/_wrap_src_index_.extractfield)
* [FilterInputObjectFields](/docs/api/classes/_wrap_src_index_.filterinputobjectfields)
* [FilterInterfaceFields](/docs/api/classes/_wrap_src_index_.filterinterfacefields)
* [FilterObjectFields](/docs/api/classes/_wrap_src_index_.filterobjectfields)
* [FilterRootFields](/docs/api/classes/_wrap_src_index_.filterrootfields)
* [FilterTypes](/docs/api/classes/_wrap_src_index_.filtertypes)
* [HoistField](/docs/api/classes/_wrap_src_index_.hoistfield)
* [MapFields](/docs/api/classes/_wrap_src_index_.mapfields)
* [MapLeafValues](/docs/api/classes/_wrap_src_index_.mapleafvalues)
* [PruneTypes](/docs/api/classes/_wrap_src_index_.prunetypes)
* [RenameInputObjectFields](/docs/api/classes/_wrap_src_index_.renameinputobjectfields)
* [RenameInterfaceFields](/docs/api/classes/_wrap_src_index_.renameinterfacefields)
* [RenameObjectFields](/docs/api/classes/_wrap_src_index_.renameobjectfields)
* [RenameRootFields](/docs/api/classes/_wrap_src_index_.renamerootfields)
* [RenameRootTypes](/docs/api/classes/_wrap_src_index_.renameroottypes)
* [RenameTypes](/docs/api/classes/_wrap_src_index_.renametypes)
* [TransformCompositeFields](/docs/api/classes/_wrap_src_index_.transformcompositefields)
* [TransformEnumValues](/docs/api/classes/_wrap_src_index_.transformenumvalues)
* [TransformInputObjectFields](/docs/api/classes/_wrap_src_index_.transforminputobjectfields)
* [TransformInterfaceFields](/docs/api/classes/_wrap_src_index_.transforminterfacefields)
* [TransformObjectFields](/docs/api/classes/_wrap_src_index_.transformobjectfields)
* [TransformQuery](/docs/api/classes/_wrap_src_index_.transformquery)
* [TransformRootFields](/docs/api/classes/_wrap_src_index_.transformrootfields)
* [WrapFields](/docs/api/classes/_wrap_src_index_.wrapfields)
* [WrapQuery](/docs/api/classes/_wrap_src_index_.wrapquery)
* [WrapType](/docs/api/classes/_wrap_src_index_.wraptype)

### Interfaces

* [IMakeRemoteExecutableSchemaOptions](/docs/api/interfaces/_wrap_src_index_.imakeremoteexecutableschemaoptions)

### Type aliases

* [DataTransformer](_wrap_src_index_.md#datatransformer)
* [EnumValueTransformer](_wrap_src_index_.md#enumvaluetransformer)
* [ErrorsTransformer](_wrap_src_index_.md#errorstransformer)
* [FieldNodeTransformer](_wrap_src_index_.md#fieldnodetransformer)
* [FieldTransformer](_wrap_src_index_.md#fieldtransformer)
* [InputFieldNodeTransformer](_wrap_src_index_.md#inputfieldnodetransformer)
* [InputFieldTransformer](_wrap_src_index_.md#inputfieldtransformer)
* [InputObjectNodeTransformer](_wrap_src_index_.md#inputobjectnodetransformer)
* [LeafValueTransformer](_wrap_src_index_.md#leafvaluetransformer)
* [ObjectValueTransformerMap](_wrap_src_index_.md#objectvaluetransformermap)
* [RootFieldTransformer](_wrap_src_index_.md#rootfieldtransformer)

### Functions

* [defaultCreateProxyingResolver](_wrap_src_index_.md#defaultcreateproxyingresolver)
* [defaultCreateRemoteResolver](_wrap_src_index_.md#defaultcreateremoteresolver)
* [generateProxyingResolvers](_wrap_src_index_.md#generateproxyingresolvers)
* [introspectSchema](_wrap_src_index_.md#introspectschema)
* [introspectSchemaSync](_wrap_src_index_.md#introspectschemasync)
* [makeRemoteExecutableSchema](_wrap_src_index_.md#makeremoteexecutableschema)
* [wrapSchema](_wrap_src_index_.md#wrapschema)

## Type aliases

###  DataTransformer

Ƭ **DataTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L75)*

#### Type declaration:

▸ (`value`: any, `transformationContext?`: Record‹string, any›): *any*

**Parameters:**

Name | Type |
------ | ------ |
`value` | any |
`transformationContext?` | Record‹string, any› |

___

###  EnumValueTransformer

Ƭ **EnumValueTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L59)*

#### Type declaration:

▸ (`typeName`: string, `externalValue`: string, `enumValueConfig`: GraphQLEnumValueConfig): *GraphQLEnumValueConfig | [string, GraphQLEnumValueConfig] | null | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`externalValue` | string |
`enumValueConfig` | GraphQLEnumValueConfig |

___

###  ErrorsTransformer

Ƭ **ErrorsTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L79)*

#### Type declaration:

▸ (`errors`: ReadonlyArray‹GraphQLError›, `transformationContext`: Record‹string, any›): *Array‹GraphQLError›*

**Parameters:**

Name | Type |
------ | ------ |
`errors` | ReadonlyArray‹GraphQLError› |
`transformationContext` | Record‹string, any› |

___

###  FieldNodeTransformer

Ƭ **FieldNodeTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L65)*

#### Type declaration:

▸ (`typeName`: string, `fieldName`: string, `fieldNode`: FieldNode, `fragments`: Record‹string, FragmentDefinitionNode›, `transformationContext`: Record‹string, any›): *SelectionNode | Array‹SelectionNode›*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`fieldNode` | FieldNode |
`fragments` | Record‹string, FragmentDefinitionNode› |
`transformationContext` | Record‹string, any› |

___

###  FieldTransformer

Ƭ **FieldTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L47)*

#### Type declaration:

▸ (`typeName`: string, `fieldName`: string, `fieldConfig`: GraphQLFieldConfig‹any, any›): *GraphQLFieldConfig‹any, any› | [string, GraphQLFieldConfig‹any, any›] | null | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`fieldConfig` | GraphQLFieldConfig‹any, any› |

___

###  InputFieldNodeTransformer

Ƭ **InputFieldNodeTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L32)*

#### Type declaration:

▸ (`typeName`: string, `fieldName`: string, `inputFieldNode`: ObjectFieldNode, `request`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: DelegationContext): *ObjectFieldNode | Array‹ObjectFieldNode›*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`inputFieldNode` | ObjectFieldNode |
`request` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`delegationContext?` | DelegationContext |

___

###  InputFieldTransformer

Ƭ **InputFieldTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L26)*

#### Type declaration:

▸ (`typeName`: string, `fieldName`: string, `inputFieldConfig`: GraphQLInputFieldConfig): *GraphQLInputFieldConfig | [string, GraphQLInputFieldConfig] | null | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`fieldName` | string |
`inputFieldConfig` | GraphQLInputFieldConfig |

___

###  InputObjectNodeTransformer

Ƭ **InputObjectNodeTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L40)*

#### Type declaration:

▸ (`typeName`: string, `inputObjectNode`: ObjectValueNode, `request`: [Request](/docs/api/interfaces/_utils_src_index_.request), `delegationContext?`: DelegationContext): *ObjectValueNode*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`inputObjectNode` | ObjectValueNode |
`request` | [Request](/docs/api/interfaces/_utils_src_index_.request) |
`delegationContext?` | DelegationContext |

___

###  LeafValueTransformer

Ƭ **LeafValueTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L73)*

#### Type declaration:

▸ (`typeName`: string, `value`: any): *any*

**Parameters:**

Name | Type |
------ | ------ |
`typeName` | string |
`value` | any |

___

###  ObjectValueTransformerMap

Ƭ **ObjectValueTransformerMap**: *Record‹string, [DataTransformer](_wrap_src_index_.md#datatransformer)›*

*Defined in [packages/wrap/src/types.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L77)*

___

###  RootFieldTransformer

Ƭ **RootFieldTransformer**: *function*

*Defined in [packages/wrap/src/types.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/types.ts#L53)*

#### Type declaration:

▸ (`operation`: "Query" | "Mutation" | "Subscription", `fieldName`: string, `fieldConfig`: GraphQLFieldConfig‹any, any›): *GraphQLFieldConfig‹any, any› | [string, GraphQLFieldConfig‹any, any›] | null | undefined*

**Parameters:**

Name | Type |
------ | ------ |
`operation` | "Query" &#124; "Mutation" &#124; "Subscription" |
`fieldName` | string |
`fieldConfig` | GraphQLFieldConfig‹any, any› |

## Functions

###  defaultCreateProxyingResolver

▸ **defaultCreateProxyingResolver**(`__namedParameters`: object): *GraphQLFieldResolver‹any, any›*

*Defined in [packages/wrap/src/generateProxyingResolvers.ts:108](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/generateProxyingResolvers.ts#L108)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`operation` | "query" &#124; "mutation" &#124; "subscription" |
`schema` | GraphQLSchema‹› &#124; SubschemaConfig |
`transformedSchema` | GraphQLSchema‹› |
`transforms` | [Transform](/docs/api/interfaces/_utils_src_index_.transform)‹object›[] |

**Returns:** *GraphQLFieldResolver‹any, any›*

___

###  defaultCreateRemoteResolver

▸ **defaultCreateRemoteResolver**(`executor`: Executor, `subscriber`: Subscriber): *GraphQLFieldResolver‹any, any›*

*Defined in [packages/wrap/src/makeRemoteExecutableSchema.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/makeRemoteExecutableSchema.ts#L24)*

**Parameters:**

Name | Type |
------ | ------ |
`executor` | Executor |
`subscriber` | Subscriber |

**Returns:** *GraphQLFieldResolver‹any, any›*

___

###  generateProxyingResolvers

▸ **generateProxyingResolvers**(`subschemaOrSubschemaConfig`: GraphQLSchema | SubschemaConfig, `transforms`: Array‹[Transform](/docs/api/interfaces/_utils_src_index_.transform)›): *Record‹string, Record‹string, GraphQLFieldResolver‹any, any›››*

*Defined in [packages/wrap/src/generateProxyingResolvers.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/generateProxyingResolvers.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`subschemaOrSubschemaConfig` | GraphQLSchema &#124; SubschemaConfig |
`transforms` | Array‹[Transform](/docs/api/interfaces/_utils_src_index_.transform)› |

**Returns:** *Record‹string, Record‹string, GraphQLFieldResolver‹any, any›››*

___

###  introspectSchema

▸ **introspectSchema**(`executor`: AsyncExecutor, `context?`: Record‹string, any›): *Promise‹GraphQLSchema›*

*Defined in [packages/wrap/src/introspect.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L29)*

**Parameters:**

Name | Type |
------ | ------ |
`executor` | AsyncExecutor |
`context?` | Record‹string, any› |

**Returns:** *Promise‹GraphQLSchema›*

___

###  introspectSchemaSync

▸ **introspectSchemaSync**(`executor`: SyncExecutor, `context?`: Record‹string, any›): *GraphQLSchema*

*Defined in [packages/wrap/src/introspect.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/introspect.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`executor` | SyncExecutor |
`context?` | Record‹string, any› |

**Returns:** *GraphQLSchema*

___

###  makeRemoteExecutableSchema

▸ **makeRemoteExecutableSchema**(`__namedParameters`: object): *GraphQLSchema*

*Defined in [packages/wrap/src/makeRemoteExecutableSchema.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/makeRemoteExecutableSchema.ts#L8)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`buildSchemaOptions` | BuildSchemaOptions | - |
`createResolver` | function | defaultCreateRemoteResolver |
`executor` | function &#124; function | - |
`schemaOrTypeDefs` | string &#124; GraphQLSchema‹› | - |
`subscriber` | function | - |

**Returns:** *GraphQLSchema*

___

###  wrapSchema

▸ **wrapSchema**(`subschemaOrSubschemaConfig`: GraphQLSchema | SubschemaConfig, `transforms?`: Array‹[Transform](/docs/api/interfaces/_utils_src_index_.transform)›): *GraphQLSchema*

*Defined in [packages/wrap/src/wrapSchema.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/wrapSchema.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`subschemaOrSubschemaConfig` | GraphQLSchema &#124; SubschemaConfig |
`transforms?` | Array‹[Transform](/docs/api/interfaces/_utils_src_index_.transform)› |

**Returns:** *GraphQLSchema*
