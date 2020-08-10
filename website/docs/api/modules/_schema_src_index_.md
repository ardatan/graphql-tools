---
id: "_schema_src_index_"
title: "schema/src/index"
sidebar_label: "schema/src/index"
---

## Index

### Interfaces

* [IExecutableSchemaDefinition](../interfaces/_schema_src_index_.iexecutableschemadefinition.md)
* [ILogger](../interfaces/_schema_src_index_.ilogger.md)

### Functions

* [addCatchUndefinedToSchema](_schema_src_index_.md#addcatchundefinedtoschema)
* [addErrorLoggingToSchema](_schema_src_index_.md#adderrorloggingtoschema)
* [addResolversToSchema](_schema_src_index_.md#addresolverstoschema)
* [addSchemaLevelResolver](_schema_src_index_.md#addschemalevelresolver)
* [assertResolversPresent](_schema_src_index_.md#assertresolverspresent)
* [attachDirectiveResolvers](_schema_src_index_.md#attachdirectiveresolvers)
* [buildDocumentFromTypeDefinitions](_schema_src_index_.md#builddocumentfromtypedefinitions)
* [buildSchemaFromTypeDefinitions](_schema_src_index_.md#buildschemafromtypedefinitions)
* [chainResolvers](_schema_src_index_.md#chainresolvers)
* [checkForResolveTypeResolver](_schema_src_index_.md#checkforresolvetyperesolver)
* [concatenateTypeDefs](_schema_src_index_.md#concatenatetypedefs)
* [decorateWithLogger](_schema_src_index_.md#decoratewithlogger)
* [extendResolversFromInterfaces](_schema_src_index_.md#extendresolversfrominterfaces)
* [extractExtensionDefinitions](_schema_src_index_.md#extractextensiondefinitions)
* [filterExtensionDefinitions](_schema_src_index_.md#filterextensiondefinitions)
* [makeExecutableSchema](_schema_src_index_.md#makeexecutableschema)

## Functions

###  addCatchUndefinedToSchema

▸ **addCatchUndefinedToSchema**(`schema`: GraphQLSchema): *GraphQLSchema*

*Defined in [packages/schema/src/addCatchUndefinedToSchema.ts:15](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/addCatchUndefinedToSchema.ts#L15)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |

**Returns:** *GraphQLSchema*

___

###  addErrorLoggingToSchema

▸ **addErrorLoggingToSchema**(`schema`: GraphQLSchema, `logger?`: [ILogger](../interfaces/_schema_src_index_.ilogger.md)): *GraphQLSchema*

*Defined in [packages/schema/src/addErrorLoggingToSchema.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/addErrorLoggingToSchema.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`logger?` | [ILogger](../interfaces/_schema_src_index_.ilogger.md) |

**Returns:** *GraphQLSchema*

___

###  addResolversToSchema

▸ **addResolversToSchema**(`schemaOrOptions`: GraphQLSchema | [IAddResolversToSchemaOptions](../interfaces/_utils_src_index_.iaddresolverstoschemaoptions.md), `legacyInputResolvers?`: [IResolvers](_utils_src_index_.md#iresolvers), `legacyInputValidationOptions?`: [IResolverValidationOptions](../interfaces/_utils_src_index_.iresolvervalidationoptions.md)): *GraphQLSchema*

*Defined in [packages/schema/src/addResolversToSchema.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/addResolversToSchema.ts#L36)*

**Parameters:**

Name | Type |
------ | ------ |
`schemaOrOptions` | GraphQLSchema &#124; [IAddResolversToSchemaOptions](../interfaces/_utils_src_index_.iaddresolverstoschemaoptions.md) |
`legacyInputResolvers?` | [IResolvers](_utils_src_index_.md#iresolvers) |
`legacyInputValidationOptions?` | [IResolverValidationOptions](../interfaces/_utils_src_index_.iresolvervalidationoptions.md) |

**Returns:** *GraphQLSchema*

___

###  addSchemaLevelResolver

▸ **addSchemaLevelResolver**(`schema`: GraphQLSchema, `fn`: GraphQLFieldResolver‹any, any›): *GraphQLSchema*

*Defined in [packages/schema/src/addSchemaLevelResolver.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/addSchemaLevelResolver.ts#L6)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`fn` | GraphQLFieldResolver‹any, any› |

**Returns:** *GraphQLSchema*

___

###  assertResolversPresent

▸ **assertResolversPresent**(`schema`: GraphQLSchema, `resolverValidationOptions`: [IResolverValidationOptions](../interfaces/_utils_src_index_.iresolvervalidationoptions.md)): *void*

*Defined in [packages/schema/src/assertResolversPresent.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/assertResolversPresent.ts#L5)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`schema` | GraphQLSchema | - |
`resolverValidationOptions` | [IResolverValidationOptions](../interfaces/_utils_src_index_.iresolvervalidationoptions.md) | {} |

**Returns:** *void*

___

###  attachDirectiveResolvers

▸ **attachDirectiveResolvers**(`schema`: GraphQLSchema, `directiveResolvers`: [IDirectiveResolvers](../interfaces/_utils_src_index_.idirectiveresolvers.md)): *GraphQLSchema*

*Defined in [packages/schema/src/attachDirectiveResolvers.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/attachDirectiveResolvers.ts#L5)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`directiveResolvers` | [IDirectiveResolvers](../interfaces/_utils_src_index_.idirectiveresolvers.md) |

**Returns:** *GraphQLSchema*

___

###  buildDocumentFromTypeDefinitions

▸ **buildDocumentFromTypeDefinitions**(`typeDefinitions`: [ITypeDefinitions](_utils_src_index_.md#itypedefinitions), `parseOptions?`: [GraphQLParseOptions](../interfaces/_utils_src_index_.graphqlparseoptions.md)): *DocumentNode*

*Defined in [packages/schema/src/buildSchemaFromTypeDefinitions.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/buildSchemaFromTypeDefinitions.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`typeDefinitions` | [ITypeDefinitions](_utils_src_index_.md#itypedefinitions) |
`parseOptions?` | [GraphQLParseOptions](../interfaces/_utils_src_index_.graphqlparseoptions.md) |

**Returns:** *DocumentNode*

___

###  buildSchemaFromTypeDefinitions

▸ **buildSchemaFromTypeDefinitions**(`typeDefinitions`: [ITypeDefinitions](_utils_src_index_.md#itypedefinitions), `parseOptions?`: [GraphQLParseOptions](../interfaces/_utils_src_index_.graphqlparseoptions.md)): *GraphQLSchema*

*Defined in [packages/schema/src/buildSchemaFromTypeDefinitions.ts:8](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/buildSchemaFromTypeDefinitions.ts#L8)*

**Parameters:**

Name | Type |
------ | ------ |
`typeDefinitions` | [ITypeDefinitions](_utils_src_index_.md#itypedefinitions) |
`parseOptions?` | [GraphQLParseOptions](../interfaces/_utils_src_index_.graphqlparseoptions.md) |

**Returns:** *GraphQLSchema*

___

###  chainResolvers

▸ **chainResolvers**(`resolvers`: Array‹GraphQLFieldResolver‹any, any››): *(Anonymous function)*

*Defined in [packages/schema/src/chainResolvers.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/chainResolvers.ts#L3)*

**Parameters:**

Name | Type |
------ | ------ |
`resolvers` | Array‹GraphQLFieldResolver‹any, any›› |

**Returns:** *(Anonymous function)*

___

###  checkForResolveTypeResolver

▸ **checkForResolveTypeResolver**(`schema`: GraphQLSchema, `requireResolversForResolveType?`: boolean): *void*

*Defined in [packages/schema/src/checkForResolveTypeResolver.ts:4](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/checkForResolveTypeResolver.ts#L4)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`requireResolversForResolveType?` | boolean |

**Returns:** *void*

___

###  concatenateTypeDefs

▸ **concatenateTypeDefs**(`typeDefinitionsAry`: Array‹[ITypedef](_utils_src_index_.md#itypedef)›, `calledFunctionRefs`: any): *string*

*Defined in [packages/schema/src/concatenateTypeDefs.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/concatenateTypeDefs.ts#L5)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`typeDefinitionsAry` | Array‹[ITypedef](_utils_src_index_.md#itypedef)› | - |
`calledFunctionRefs` | any | [] as any |

**Returns:** *string*

___

###  decorateWithLogger

▸ **decorateWithLogger**(`fn`: GraphQLFieldResolver‹any, any›, `logger`: [ILogger](../interfaces/_schema_src_index_.ilogger.md), `hint`: string): *GraphQLFieldResolver‹any, any›*

*Defined in [packages/schema/src/decorateWithLogger.ts:9](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/decorateWithLogger.ts#L9)*

**Parameters:**

Name | Type |
------ | ------ |
`fn` | GraphQLFieldResolver‹any, any› |
`logger` | [ILogger](../interfaces/_schema_src_index_.ilogger.md) |
`hint` | string |

**Returns:** *GraphQLFieldResolver‹any, any›*

___

###  extendResolversFromInterfaces

▸ **extendResolversFromInterfaces**(`schema`: GraphQLSchema, `resolvers`: [IResolvers](_utils_src_index_.md#iresolvers)): *[IResolvers](_utils_src_index_.md#iresolvers)*

*Defined in [packages/schema/src/extendResolversFromInterfaces.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/extendResolversFromInterfaces.ts#L5)*

**Parameters:**

Name | Type |
------ | ------ |
`schema` | GraphQLSchema |
`resolvers` | [IResolvers](_utils_src_index_.md#iresolvers) |

**Returns:** *[IResolvers](_utils_src_index_.md#iresolvers)*

___

###  extractExtensionDefinitions

▸ **extractExtensionDefinitions**(`ast`: DocumentNode): *object*

*Defined in [packages/schema/src/extensionDefinitions.ts:3](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/extensionDefinitions.ts#L3)*

**Parameters:**

Name | Type |
------ | ------ |
`ast` | DocumentNode |

**Returns:** *object*

* **definitions**: *(OperationDefinitionNode | FragmentDefinitionNode | SchemaDefinitionNode | ScalarTypeDefinitionNode | ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | UnionTypeDefinitionNode | EnumTypeDefinitionNode | InputObjectTypeDefinitionNode | DirectiveDefinitionNode | SchemaExtensionNode | ScalarTypeExtensionNode | ObjectTypeExtensionNode | InterfaceTypeExtensionNode | UnionTypeExtensionNode | EnumTypeExtensionNode | InputObjectTypeExtensionNode)[]* = extensionDefs

___

###  filterExtensionDefinitions

▸ **filterExtensionDefinitions**(`ast`: DocumentNode): *object*

*Defined in [packages/schema/src/extensionDefinitions.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/extensionDefinitions.ts#L21)*

**Parameters:**

Name | Type |
------ | ------ |
`ast` | DocumentNode |

**Returns:** *object*

* **definitions**: *(OperationDefinitionNode | FragmentDefinitionNode | SchemaDefinitionNode | ScalarTypeDefinitionNode | ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | UnionTypeDefinitionNode | EnumTypeDefinitionNode | InputObjectTypeDefinitionNode | DirectiveDefinitionNode | SchemaExtensionNode | ScalarTypeExtensionNode | ObjectTypeExtensionNode | InterfaceTypeExtensionNode | UnionTypeExtensionNode | EnumTypeExtensionNode | InputObjectTypeExtensionNode)[]* = extensionDefs

___

###  makeExecutableSchema

▸ **makeExecutableSchema**‹**TContext**›(`__namedParameters`: object): *GraphQLSchema‹›*

*Defined in [packages/schema/src/makeExecutableSchema.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/makeExecutableSchema.ts#L58)*

Builds a schema from the provided type definitions and resolvers.

The type definitions are written using Schema Definition Language (SDL). They
can be provided as a string, a `DocumentNode`, a function, or an array of any
of these. If a function is provided, it will be passed no arguments and
should return an array of strings or `DocumentNode`s.

Note: You can use `graphql-tag` to not only parse a string into a
`DocumentNode` but also to provide additinal syntax hightlighting in your
editor (with the appropriate editor plugin).

```js
const typeDefs = gql`
  type Query {
    posts: [Post]
    author(id: Int!): Author
  }
`;
```

The `resolvers` object should be a map of type names to nested object, which
themselves map the type's fields to their appropriate resolvers.
See the [Resolvers](/docs/resolvers) section of the documentation for more details.

```js
const resolvers = {
  Query: {
    posts: (obj, args, ctx, info) => getAllPosts(),
    author: (obj, args, ctx, info) => getAuthorById(args.id)
  }
};
```

Once you've defined both the `typeDefs` and `resolvers`, you can create your
schema:

```js
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
```

**Type parameters:**

▪ **TContext**

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`allowUndefinedInResolve` | boolean | true |
`directiveResolvers` | [IDirectiveResolvers](../interfaces/_utils_src_index_.idirectiveresolvers.md)‹any, TContext› | - |
`inheritResolversFromInterfaces` | boolean | false |
`logger` | [ILogger](../interfaces/_schema_src_index_.ilogger.md) | - |
`parseOptions` | [GraphQLParseOptions](../interfaces/_utils_src_index_.graphqlparseoptions.md) | - |
`pruningOptions` | [PruneSchemaOptions](../interfaces/_utils_src_index_.pruneschemaoptions.md) | - |
`resolverValidationOptions` | [IResolverValidationOptions](../interfaces/_utils_src_index_.iresolvervalidationoptions.md) | - |
`resolvers` | object &#124; object[] | - |
`schemaDirectives` | object | - |
`schemaTransforms` | function[] | [] |
`typeDefs` | string &#124; function &#124; DocumentNode &#124; (string &#124; function &#124; DocumentNode)[] | - |

**Returns:** *GraphQLSchema‹›*
