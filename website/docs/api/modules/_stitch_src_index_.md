---
id: "stitch"
title: "@graphql-tools/stitch"
sidebar_label: "stitch"
---

### Functions

* [forwardArgsToSelectionSet](_stitch_src_index_.md#const-forwardargstoselectionset)
* [stitchSchemas](_stitch_src_index_.md#stitchschemas)

## Functions

### `Const` forwardArgsToSelectionSet

▸ **forwardArgsToSelectionSet**(`selectionSet`: string, `mapping?`: Record‹string, string[]›): *(Anonymous function)*

*Defined in [packages/stitch/src/selectionSetArgs.ts:7](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/selectionSetArgs.ts#L7)*

**Parameters:**

Name | Type |
------ | ------ |
`selectionSet` | string |
`mapping?` | Record‹string, string[]› |

**Returns:** *(Anonymous function)*

___

###  stitchSchemas

▸ **stitchSchemas**(`__namedParameters`: object): *GraphQLSchema*

*Defined in [packages/stitch/src/stitchSchemas.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/stitch/src/stitchSchemas.ts#L31)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`allowUndefinedInResolve` | boolean | true |
`directiveResolvers` | [IDirectiveResolvers](/docs/api/interfaces/_utils_src_index_.idirectiveresolvers)‹any, any› | - |
`inheritResolversFromInterfaces` | boolean | false |
`logger` | [ILogger](/docs/api/interfaces/_schema_src_index_.ilogger) | - |
`mergeDirectives` | boolean | - |
`mergeTypes` | false &#124; true &#124; string[] &#124; function | false |
`onTypeConflict` | function | - |
`parseOptions` | [GraphQLParseOptions](/docs/api/interfaces/_utils_src_index_.graphqlparseoptions) | - |
`pruningOptions` | [PruneSchemaOptions](/docs/api/interfaces/_utils_src_index_.pruneschemaoptions) | - |
`resolverValidationOptions` | [IResolverValidationOptions](/docs/api/interfaces/_utils_src_index_.iresolvervalidationoptions) | - |
`resolvers` | object &#124; object[] | - |
`schemaDirectives` | object | - |
`schemaTransforms` | function[] | [] |
`schemas` | string &#124; GraphQLSchema‹› &#124; DocumentNode &#124; SubschemaConfig &#124; GraphQLScalarType‹› &#124; GraphQLObjectType‹any, any› &#124; GraphQLInterfaceType‹› &#124; GraphQLUnionType‹› &#124; GraphQLEnumType‹› &#124; GraphQLInputObjectType‹›[][] | [] |
`subschemas` | GraphQLSchema‹› &#124; SubschemaConfig[] | [] |
`typeDefs` | string &#124; function &#124; DocumentNode &#124; string &#124; function &#124; DocumentNode[] | - |
`types` | GraphQLScalarType‹› &#124; GraphQLObjectType‹any, any› &#124; GraphQLInterfaceType‹› &#124; GraphQLUnionType‹› &#124; GraphQLEnumType‹› &#124; GraphQLInputObjectType‹›[] | [] |

**Returns:** *GraphQLSchema*
