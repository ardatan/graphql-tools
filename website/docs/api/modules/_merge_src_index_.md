---
id: "merge"
title: "@graphql-tools/merge"
sidebar_label: "merge"
---

### Interfaces

* [Config](../interfaces/_merge_src_index_.config)
* [MergeResolversOptions](../interfaces/_merge_src_index_.mergeresolversoptions)
* [MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig)

### Type aliases

* [EnumTypeExtensions](_merge_src_index_.md#enumtypeextensions)
* [ExtensionsObject](_merge_src_index_.md#extensionsobject)
* [InputTypeExtensions](_merge_src_index_.md#inputtypeextensions)
* [InterfaceTypeExtensions](_merge_src_index_.md#interfacetypeextensions)
* [MergedResultMap](_merge_src_index_.md#mergedresultmap)
* [ObjectTypeExtensions](_merge_src_index_.md#objecttypeextensions)
* [PossibleTypeExtensions](_merge_src_index_.md#possibletypeextensions)
* [ResolversDefinition](_merge_src_index_.md#resolversdefinition)
* [ResolversFactory](_merge_src_index_.md#resolversfactory)
* [ScalarTypeExtensions](_merge_src_index_.md#scalartypeextensions)
* [SchemaExtensions](_merge_src_index_.md#schemaextensions)
* [UnionTypeExtensions](_merge_src_index_.md#uniontypeextensions)

### Functions

* [applyExtensions](_merge_src_index_.md#applyextensions)
* [collectComment](_merge_src_index_.md#collectcomment)
* [extractExtensionsFromSchema](_merge_src_index_.md#extractextensionsfromschema)
* [extractType](_merge_src_index_.md#extracttype)
* [isGraphQLDirective](_merge_src_index_.md#isgraphqldirective)
* [isGraphQLEnum](_merge_src_index_.md#isgraphqlenum)
* [isGraphQLEnumExtension](_merge_src_index_.md#isgraphqlenumextension)
* [isGraphQLInputType](_merge_src_index_.md#isgraphqlinputtype)
* [isGraphQLInputTypeExtension](_merge_src_index_.md#isgraphqlinputtypeextension)
* [isGraphQLInterface](_merge_src_index_.md#isgraphqlinterface)
* [isGraphQLInterfaceExtension](_merge_src_index_.md#isgraphqlinterfaceextension)
* [isGraphQLScalar](_merge_src_index_.md#isgraphqlscalar)
* [isGraphQLScalarExtension](_merge_src_index_.md#isgraphqlscalarextension)
* [isGraphQLType](_merge_src_index_.md#isgraphqltype)
* [isGraphQLTypeExtension](_merge_src_index_.md#isgraphqltypeextension)
* [isGraphQLUnion](_merge_src_index_.md#isgraphqlunion)
* [isGraphQLUnionExtension](_merge_src_index_.md#isgraphqlunionextension)
* [isListTypeNode](_merge_src_index_.md#islisttypenode)
* [isNonNullTypeNode](_merge_src_index_.md#isnonnulltypenode)
* [isSchemaDefinition](_merge_src_index_.md#isschemadefinition)
* [isSourceTypes](_merge_src_index_.md#issourcetypes)
* [isStringTypes](_merge_src_index_.md#isstringtypes)
* [isWrappingTypeNode](_merge_src_index_.md#iswrappingtypenode)
* [mergeArguments](_merge_src_index_.md#mergearguments)
* [mergeDirective](_merge_src_index_.md#mergedirective)
* [mergeDirectives](_merge_src_index_.md#mergedirectives)
* [mergeEnum](_merge_src_index_.md#mergeenum)
* [mergeEnumValues](_merge_src_index_.md#mergeenumvalues)
* [mergeExtensions](_merge_src_index_.md#mergeextensions)
* [mergeFields](_merge_src_index_.md#mergefields)
* [mergeGraphQLNodes](_merge_src_index_.md#mergegraphqlnodes)
* [mergeGraphQLSchemas](_merge_src_index_.md#mergegraphqlschemas)
* [mergeGraphQLTypes](_merge_src_index_.md#mergegraphqltypes)
* [mergeInputType](_merge_src_index_.md#mergeinputtype)
* [mergeInterface](_merge_src_index_.md#mergeinterface)
* [mergeNamedTypeArray](_merge_src_index_.md#mergenamedtypearray)
* [mergeResolvers](_merge_src_index_.md#mergeresolvers)
* [mergeSchemas](_merge_src_index_.md#mergeschemas)
* [mergeSchemasAsync](_merge_src_index_.md#mergeschemasasync)
* [mergeType](_merge_src_index_.md#mergetype)
* [mergeTypeDefs](_merge_src_index_.md#mergetypedefs)
* [mergeUnion](_merge_src_index_.md#mergeunion)
* [printComment](_merge_src_index_.md#printcomment)
* [printTypeNode](_merge_src_index_.md#printtypenode)
* [printWithComments](_merge_src_index_.md#printwithcomments)
* [pushComment](_merge_src_index_.md#pushcomment)
* [resetComments](_merge_src_index_.md#resetcomments)
* [travelSchemaPossibleExtensions](_merge_src_index_.md#travelschemapossibleextensions)

## Type aliases

###  EnumTypeExtensions

Ƭ **EnumTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L49)*

#### Type declaration:

* **type**: *"enum"*

* **values**: *Record‹string, [ExtensionsObject](_merge_src_index_.md#extensionsobject)›*

___

###  ExtensionsObject

Ƭ **ExtensionsObject**: *Record‹string, any›*

*Defined in [packages/merge/src/extensions.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L24)*

___

###  InputTypeExtensions

Ƭ **InputTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L31)*

#### Type declaration:

* **fields**: *Record‹string, object›*

* **type**: *"input"*

___

###  InterfaceTypeExtensions

Ƭ **InterfaceTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L36)*

#### Type declaration:

* **fields**: *Record‹string, object›*

* **type**: *"interface"*

___

###  MergedResultMap

Ƭ **MergedResultMap**: *object*

*Defined in [packages/merge/src/typedefs-mergers/merge-nodes.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L26)*

#### Type declaration:

* \[ **name**: *string*\]: DefinitionNode

___

###  ObjectTypeExtensions

Ƭ **ObjectTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L26)*

#### Type declaration:

* **fields**: *Record‹string, object›*

* **type**: *"object"*

___

###  PossibleTypeExtensions

Ƭ **PossibleTypeExtensions**: *[InputTypeExtensions](_merge_src_index_.md#inputtypeextensions) | [InterfaceTypeExtensions](_merge_src_index_.md#interfacetypeextensions) | [ObjectTypeExtensions](_merge_src_index_.md#objecttypeextensions) | [UnionTypeExtensions](_merge_src_index_.md#uniontypeextensions) | [ScalarTypeExtensions](_merge_src_index_.md#scalartypeextensions) | [EnumTypeExtensions](_merge_src_index_.md#enumtypeextensions)*

*Defined in [packages/merge/src/extensions.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L54)*

___

###  ResolversDefinition

Ƭ **ResolversDefinition**: *[IResolvers](_utils_src_index_.md#iresolvers)‹any, TContext› | [ResolversFactory](_merge_src_index_.md#resolversfactory)‹TContext›*

*Defined in [packages/merge/src/merge-resolvers.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-resolvers.ts#L4)*

___

###  ResolversFactory

Ƭ **ResolversFactory**: *function*

*Defined in [packages/merge/src/merge-resolvers.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-resolvers.ts#L3)*

#### Type declaration:

▸ (...`args`: any[]): *[IResolvers](_utils_src_index_.md#iresolvers)‹any, TContext›*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | any[] |

___

###  ScalarTypeExtensions

Ƭ **ScalarTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L45)*

#### Type declaration:

* **type**: *"scalar"*

___

###  SchemaExtensions

Ƭ **SchemaExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L61)*

#### Type declaration:

* **schemaExtensions**: *[ExtensionsObject](_merge_src_index_.md#extensionsobject)*

* **types**: *Record‹string, object & [PossibleTypeExtensions](_merge_src_index_.md#possibletypeextensions)›*

___

###  UnionTypeExtensions

Ƭ **UnionTypeExtensions**: *object*

*Defined in [packages/merge/src/extensions.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L41)*

#### Type declaration:

* **type**: *"union"*

## Functions

###  applyExtensions

▸ **applyExtensions**(`schema`: GraphQLSchema, `extensions`: [SchemaExtensions](_merge_src_index_.md#schemaextensions)): *GraphQLSchema*

*Defined in [packages/merge/src/extensions.ts:157](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L157)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`extensions` | [SchemaExtensions](_merge_src_index_.md#schemaextensions) |

**Returns:** *GraphQLSchema*

___

###  collectComment

▸ **collectComment**(`node`: TypeDefinitionNode): *void*

*Defined in [packages/merge/src/typedefs-mergers/comments.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/comments.ts#L22)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | TypeDefinitionNode |

**Returns:** *void*

___

###  extractExtensionsFromSchema

▸ **extractExtensionsFromSchema**(`schema`: GraphQLSchema): *[SchemaExtensions](_merge_src_index_.md#schemaextensions)*

*Defined in [packages/merge/src/extensions.ts:198](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L198)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *[SchemaExtensions](_merge_src_index_.md#schemaextensions)*

___

###  extractType

▸ **extractType**(`type`: TypeNode): *NamedTypeNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | TypeNode |

**Returns:** *NamedTypeNode*

___

###  isGraphQLDirective

▸ **isGraphQLDirective**(`definition`: DefinitionNode): *definition is DirectiveDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L81)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is DirectiveDefinitionNode*

___

###  isGraphQLEnum

▸ **isGraphQLEnum**(`definition`: DefinitionNode): *definition is EnumTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is EnumTypeDefinitionNode*

___

###  isGraphQLEnumExtension

▸ **isGraphQLEnumExtension**(`definition`: DefinitionNode): *definition is EnumTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L45)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is EnumTypeExtensionNode*

___

###  isGraphQLInputType

▸ **isGraphQLInputType**(`definition`: DefinitionNode): *definition is InputObjectTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:65](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L65)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is InputObjectTypeDefinitionNode*

___

###  isGraphQLInputTypeExtension

▸ **isGraphQLInputTypeExtension**(`definition`: DefinitionNode): *definition is InputObjectTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L69)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is InputObjectTypeExtensionNode*

___

###  isGraphQLInterface

▸ **isGraphQLInterface**(`definition`: DefinitionNode): *definition is InterfaceTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L73)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is InterfaceTypeDefinitionNode*

___

###  isGraphQLInterfaceExtension

▸ **isGraphQLInterfaceExtension**(`definition`: DefinitionNode): *definition is InterfaceTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L77)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is InterfaceTypeExtensionNode*

___

###  isGraphQLScalar

▸ **isGraphQLScalar**(`definition`: DefinitionNode): *definition is ScalarTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L57)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is ScalarTypeDefinitionNode*

___

###  isGraphQLScalarExtension

▸ **isGraphQLScalarExtension**(`definition`: DefinitionNode): *definition is ScalarTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is ScalarTypeExtensionNode*

___

###  isGraphQLType

▸ **isGraphQLType**(`definition`: DefinitionNode): *definition is ObjectTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is ObjectTypeDefinitionNode*

___

###  isGraphQLTypeExtension

▸ **isGraphQLTypeExtension**(`definition`: DefinitionNode): *definition is ObjectTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L37)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is ObjectTypeExtensionNode*

___

###  isGraphQLUnion

▸ **isGraphQLUnion**(`definition`: DefinitionNode): *definition is UnionTypeDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is UnionTypeDefinitionNode*

___

###  isGraphQLUnionExtension

▸ **isGraphQLUnionExtension**(`definition`: DefinitionNode): *definition is UnionTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L53)*

**Parameters:**

Name | Type |
------ | ------ |
`definition` | DefinitionNode |

**Returns:** *definition is UnionTypeExtensionNode*

___

###  isListTypeNode

▸ **isListTypeNode**(`type`: TypeNode): *type is ListTypeNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:101](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L101)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | TypeNode |

**Returns:** *type is ListTypeNode*

___

###  isNonNullTypeNode

▸ **isNonNullTypeNode**(`type`: TypeNode): *type is NonNullTypeNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L105)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | TypeNode |

**Returns:** *type is NonNullTypeNode*

___

###  isSchemaDefinition

▸ **isSchemaDefinition**(`node`: DefinitionNode): *node is SchemaDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:93](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L93)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | DefinitionNode |

**Returns:** *node is SchemaDefinitionNode*

___

###  isSourceTypes

▸ **isSourceTypes**(`types`: any): *types is Source*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L29)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | any |

**Returns:** *types is Source*

___

###  isStringTypes

▸ **isStringTypes**(`types`: any): *types is string*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | any |

**Returns:** *types is string*

___

###  isWrappingTypeNode

▸ **isWrappingTypeNode**(`type`: TypeNode): *type is ListTypeNode | NonNullTypeNode*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L97)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | TypeNode |

**Returns:** *type is ListTypeNode | NonNullTypeNode*

___

###  mergeArguments

▸ **mergeArguments**(`args1`: InputValueDefinitionNode[], `args2`: InputValueDefinitionNode[], `config`: [Config](../interfaces/_merge_src_index_.config)): *InputValueDefinitionNode[]*

*Defined in [packages/merge/src/typedefs-mergers/arguments.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/arguments.ts#L5)*

**Parameters:**

Name | Type |
------ | ------ |
`args1` | InputValueDefinitionNode[] |
`args2` | InputValueDefinitionNode[] |
`config` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *InputValueDefinitionNode[]*

___

###  mergeDirective

▸ **mergeDirective**(`node`: DirectiveDefinitionNode, `existingNode?`: DirectiveDefinitionNode): *DirectiveDefinitionNode*

*Defined in [packages/merge/src/typedefs-mergers/directives.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/directives.ts#L98)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | DirectiveDefinitionNode |
`existingNode?` | DirectiveDefinitionNode |

**Returns:** *DirectiveDefinitionNode*

___

###  mergeDirectives

▸ **mergeDirectives**(`d1`: ReadonlyArray‹DirectiveNode›, `d2`: ReadonlyArray‹DirectiveNode›, `config?`: [Config](../interfaces/_merge_src_index_.config)): *DirectiveNode[]*

*Defined in [packages/merge/src/typedefs-mergers/directives.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/directives.ts#L59)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`d1` | ReadonlyArray‹DirectiveNode› | [] |
`d2` | ReadonlyArray‹DirectiveNode› | [] |
`config?` | [Config](../interfaces/_merge_src_index_.config) | - |

**Returns:** *DirectiveNode[]*

___

###  mergeEnum

▸ **mergeEnum**(`e1`: EnumTypeDefinitionNode | EnumTypeExtensionNode, `e2`: EnumTypeDefinitionNode | EnumTypeExtensionNode, `config?`: [Config](../interfaces/_merge_src_index_.config)): *EnumTypeDefinitionNode | EnumTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/enum.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/enum.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`e1` | EnumTypeDefinitionNode &#124; EnumTypeExtensionNode |
`e2` | EnumTypeDefinitionNode &#124; EnumTypeExtensionNode |
`config?` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *EnumTypeDefinitionNode | EnumTypeExtensionNode*

___

###  mergeEnumValues

▸ **mergeEnumValues**(`first`: ReadonlyArray‹EnumValueDefinitionNode›, `second`: ReadonlyArray‹EnumValueDefinitionNode›, `config`: [Config](../interfaces/_merge_src_index_.config)): *EnumValueDefinitionNode[]*

*Defined in [packages/merge/src/typedefs-mergers/enum-values.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/enum-values.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`first` | ReadonlyArray‹EnumValueDefinitionNode› |
`second` | ReadonlyArray‹EnumValueDefinitionNode› |
`config` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *EnumValueDefinitionNode[]*

___

###  mergeExtensions

▸ **mergeExtensions**(`extensions`: [SchemaExtensions](_merge_src_index_.md#schemaextensions)[]): *[SchemaExtensions](_merge_src_index_.md#schemaextensions)*

*Defined in [packages/merge/src/extensions.ts:142](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L142)*

**Parameters:**

Name | Type |
------ | ------ |
`extensions` | [SchemaExtensions](_merge_src_index_.md#schemaextensions)[] |

**Returns:** *[SchemaExtensions](_merge_src_index_.md#schemaextensions)*

___

###  mergeFields

▸ **mergeFields**‹**T**›(`type`: object, `f1`: ReadonlyArray‹T›, `f2`: ReadonlyArray‹T›, `config`: [Config](../interfaces/_merge_src_index_.config)): *T[]*

*Defined in [packages/merge/src/typedefs-mergers/fields.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/fields.ts#L25)*

**Type parameters:**

▪ **T**: *FieldDefinitionNode | InputValueDefinitionNode*

**Parameters:**

▪ **type**: *object*

Name | Type |
------ | ------ |
`name` | NameNode |

▪ **f1**: *ReadonlyArray‹T›*

▪ **f2**: *ReadonlyArray‹T›*

▪ **config**: *[Config](../interfaces/_merge_src_index_.config)*

**Returns:** *T[]*

___

###  mergeGraphQLNodes

▸ **mergeGraphQLNodes**(`nodes`: ReadonlyArray‹DefinitionNode›, `config?`: [Config](../interfaces/_merge_src_index_.config)): *[MergedResultMap](_merge_src_index_.md#mergedresultmap)*

*Defined in [packages/merge/src/typedefs-mergers/merge-nodes.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-nodes.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`nodes` | ReadonlyArray‹DefinitionNode› |
`config?` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *[MergedResultMap](_merge_src_index_.md#mergedresultmap)*

___

###  mergeGraphQLSchemas

▸ **mergeGraphQLSchemas**(`types`: Array‹string | Source | DocumentNode | GraphQLSchema›, `config?`: Omit‹Partial‹[Config](../interfaces/_merge_src_index_.config)›, "commentDescriptions"›): *OperationDefinitionNode | FragmentDefinitionNode | SchemaDefinitionNode | ScalarTypeDefinitionNode | ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | UnionTypeDefinitionNode | EnumTypeDefinitionNode | InputObjectTypeDefinitionNode | DirectiveDefinitionNode | SchemaExtensionNode | ScalarTypeExtensionNode | ObjectTypeExtensionNode | InterfaceTypeExtensionNode | UnionTypeExtensionNode | EnumTypeExtensionNode | InputObjectTypeExtensionNode[]*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L62)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | Array‹string &#124; Source &#124; DocumentNode &#124; GraphQLSchema› |
`config?` | Omit‹Partial‹[Config](../interfaces/_merge_src_index_.config)›, "commentDescriptions"› |

**Returns:** *OperationDefinitionNode | FragmentDefinitionNode | SchemaDefinitionNode | ScalarTypeDefinitionNode | ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | UnionTypeDefinitionNode | EnumTypeDefinitionNode | InputObjectTypeDefinitionNode | DirectiveDefinitionNode | SchemaExtensionNode | ScalarTypeExtensionNode | ObjectTypeExtensionNode | InterfaceTypeExtensionNode | UnionTypeExtensionNode | EnumTypeExtensionNode | InputObjectTypeExtensionNode[]*

___

###  mergeGraphQLTypes

▸ **mergeGraphQLTypes**(`types`: Array‹string | Source | DocumentNode | GraphQLSchema›, `config`: [Config](../interfaces/_merge_src_index_.config)): *DefinitionNode[]*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L119)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | Array‹string &#124; Source &#124; DocumentNode &#124; GraphQLSchema› |
`config` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *DefinitionNode[]*

___

###  mergeInputType

▸ **mergeInputType**(`node`: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode, `existingNode`: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode, `config?`: [Config](../interfaces/_merge_src_index_.config)): *InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/input-type.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/input-type.ts#L7)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | InputObjectTypeDefinitionNode &#124; InputObjectTypeExtensionNode |
`existingNode` | InputObjectTypeDefinitionNode &#124; InputObjectTypeExtensionNode |
`config?` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode*

___

###  mergeInterface

▸ **mergeInterface**(`node`: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode, `existingNode`: InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode, `config`: [Config](../interfaces/_merge_src_index_.config)): *InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/interface.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/interface.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | InterfaceTypeDefinitionNode &#124; InterfaceTypeExtensionNode |
`existingNode` | InterfaceTypeDefinitionNode &#124; InterfaceTypeExtensionNode |
`config` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode*

___

###  mergeNamedTypeArray

▸ **mergeNamedTypeArray**(`first`: ReadonlyArray‹NamedTypeNode›, `second`: ReadonlyArray‹NamedTypeNode›, `config`: [Config](../interfaces/_merge_src_index_.config)): *NamedTypeNode[]*

*Defined in [packages/merge/src/typedefs-mergers/merge-named-type-array.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-named-type-array.ts#L9)*

**Parameters:**

Name | Type |
------ | ------ |
`first` | ReadonlyArray‹NamedTypeNode› |
`second` | ReadonlyArray‹NamedTypeNode› |
`config` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *NamedTypeNode[]*

___

###  mergeResolvers

▸ **mergeResolvers**‹**TContext**, **T**›(`resolversDefinitions`: T[], `options?`: [MergeResolversOptions](../interfaces/_merge_src_index_.mergeresolversoptions)): *T*

*Defined in [packages/merge/src/merge-resolvers.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-resolvers.ts#L42)*

Deep merges multiple resolver definition objects into a single definition.

**Type parameters:**

▪ **TContext**

▪ **T**: *[ResolversDefinition](_merge_src_index_.md#resolversdefinition)‹TContext›*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`resolversDefinitions` | T[] | Resolver definitions to be merged |
`options?` | [MergeResolversOptions](../interfaces/_merge_src_index_.mergeresolversoptions) | Additional options  ```js const { mergeResolvers } = require('@graphql-tools/merge'); const clientResolver = require('./clientResolver'); const productResolver = require('./productResolver');  const resolvers = mergeResolvers([  clientResolver,  productResolver, ]); ```  If you don't want to manually create the array of resolver objects, you can also use this function along with loadFiles:  ```js const path = require('path'); const { mergeResolvers } = require('@graphql-tools/merge'); const { loadFilesSync } = require('@graphql-tools/load-files');  const resolversArray = loadFilesSync(path.join(__dirname, './resolvers'));  const resolvers = mergeResolvers(resolversArray) ```  |

**Returns:** *T*

___

###  mergeSchemas

▸ **mergeSchemas**(`config`: [MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig)): *GraphQLSchema‹›*

*Defined in [packages/merge/src/merge-schemas.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L56)*

Synchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`config` | [MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig) | Configuration object  |

**Returns:** *GraphQLSchema‹›*

___

###  mergeSchemasAsync

▸ **mergeSchemasAsync**(`config`: [MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig)): *Promise‹GraphQLSchema‹››*

*Defined in [packages/merge/src/merge-schemas.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L76)*

Synchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`config` | [MergeSchemasConfig](../interfaces/_merge_src_index_.mergeschemasconfig) | Configuration object  |

**Returns:** *Promise‹GraphQLSchema‹››*

___

###  mergeType

▸ **mergeType**(`node`: ObjectTypeDefinitionNode | ObjectTypeExtensionNode, `existingNode`: ObjectTypeDefinitionNode | ObjectTypeExtensionNode, `config?`: [Config](../interfaces/_merge_src_index_.config)): *ObjectTypeDefinitionNode | ObjectTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/type.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/type.ts#L7)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | ObjectTypeDefinitionNode &#124; ObjectTypeExtensionNode |
`existingNode` | ObjectTypeDefinitionNode &#124; ObjectTypeExtensionNode |
`config?` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *ObjectTypeDefinitionNode | ObjectTypeExtensionNode*

___

###  mergeTypeDefs

▸ **mergeTypeDefs**(`types`: Array‹string | Source | DocumentNode | GraphQLSchema›): *DocumentNode*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L80)*

Merges multiple type definitions into a single `DocumentNode`

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`types` | Array‹string &#124; Source &#124; DocumentNode &#124; GraphQLSchema› | The type definitions to be merged  |

**Returns:** *DocumentNode*

▸ **mergeTypeDefs**(`types`: Array‹string | Source | DocumentNode | GraphQLSchema›, `config?`: Partial‹[Config](../interfaces/_merge_src_index_.config)› & object): *string*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:81](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L81)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | Array‹string &#124; Source &#124; DocumentNode &#124; GraphQLSchema› |
`config?` | Partial‹[Config](../interfaces/_merge_src_index_.config)› & object |

**Returns:** *string*

▸ **mergeTypeDefs**(`types`: Array‹string | Source | DocumentNode | GraphQLSchema›, `config?`: Omit‹Partial‹[Config](../interfaces/_merge_src_index_.config)›, "commentDescriptions"›): *DocumentNode*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`types` | Array‹string &#124; Source &#124; DocumentNode &#124; GraphQLSchema› |
`config?` | Omit‹Partial‹[Config](../interfaces/_merge_src_index_.config)›, "commentDescriptions"› |

**Returns:** *DocumentNode*

___

###  mergeUnion

▸ **mergeUnion**(`first`: UnionTypeDefinitionNode | UnionTypeExtensionNode, `second`: UnionTypeDefinitionNode | UnionTypeExtensionNode, `config?`: [Config](../interfaces/_merge_src_index_.config)): *UnionTypeDefinitionNode | UnionTypeExtensionNode*

*Defined in [packages/merge/src/typedefs-mergers/union.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/union.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`first` | UnionTypeDefinitionNode &#124; UnionTypeExtensionNode |
`second` | UnionTypeDefinitionNode &#124; UnionTypeExtensionNode |
`config?` | [Config](../interfaces/_merge_src_index_.config) |

**Returns:** *UnionTypeDefinitionNode | UnionTypeExtensionNode*

___

###  printComment

▸ **printComment**(`comment`: string): *string*

*Defined in [packages/merge/src/typedefs-mergers/comments.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/comments.ts#L82)*

**Parameters:**

Name | Type |
------ | ------ |
`comment` | string |

**Returns:** *string*

___

###  printTypeNode

▸ **printTypeNode**(`type`: TypeNode): *string*

*Defined in [packages/merge/src/typedefs-mergers/utils.ts:109](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/utils.ts#L109)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | TypeNode |

**Returns:** *string*

___

###  printWithComments

▸ **printWithComments**(`ast`: ASTNode): *any*

*Defined in [packages/merge/src/typedefs-mergers/comments.ts:172](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/comments.ts#L172)*

Converts an AST into a string, using one set of reasonable
formatting rules.

**Parameters:**

Name | Type |
------ | ------ |
`ast` | ASTNode |

**Returns:** *any*

___

###  pushComment

▸ **pushComment**(`node`: object, `entity`: string, `field?`: string, `argument?`: string): *void*

*Defined in [packages/merge/src/typedefs-mergers/comments.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/comments.ts#L51)*

**Parameters:**

▪ **node**: *object*

Name | Type |
------ | ------ |
`description?` | StringValueNode |

▪ **entity**: *string*

▪`Optional`  **field**: *string*

▪`Optional`  **argument**: *string*

**Returns:** *void*

___

###  resetComments

▸ **resetComments**(): *void*

*Defined in [packages/merge/src/typedefs-mergers/comments.ts:18](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/comments.ts#L18)*

**Returns:** *void*

___

###  travelSchemaPossibleExtensions

▸ **travelSchemaPossibleExtensions**(`schema`: GraphQLSchema, `hooks`: object): *void*

*Defined in [packages/merge/src/extensions.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/extensions.ts#L66)*

**Parameters:**

▪ **schema**: *GraphQLSchema*

▪ **hooks**: *object*

Name | Type |
------ | ------ |
`onEnum` | function |
`onEnumValue` | function |
`onInputFieldType` | function |
`onInputType` | function |
`onInterface` | function |
`onInterfaceField` | function |
`onInterfaceFieldArg` | function |
`onObjectField` | function |
`onObjectFieldArg` | function |
`onObjectType` | function |
`onScalar` | function |
`onSchema` | function |
`onUnion` | function |

**Returns:** *void*
