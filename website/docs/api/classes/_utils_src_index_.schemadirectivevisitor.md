---
id: "_utils_src_index_.schemadirectivevisitor"
title: "SchemaDirectiveVisitor"
sidebar_label: "SchemaDirectiveVisitor"
---

## Type parameters

▪ **TArgs**

▪ **TContext**

## Hierarchy

* [SchemaVisitor](_utils_src_index_.schemavisitor)

  ↳ **SchemaDirectiveVisitor**

## Index

### Properties

* [args](_utils_src_index_.schemadirectivevisitor.md#args)
* [context](_utils_src_index_.schemadirectivevisitor.md#context)
* [name](_utils_src_index_.schemadirectivevisitor.md#name)
* [schema](_utils_src_index_.schemadirectivevisitor.md#schema)
* [visitedType](_utils_src_index_.schemadirectivevisitor.md#visitedtype)

### Methods

* [visitArgumentDefinition](_utils_src_index_.schemadirectivevisitor.md#visitargumentdefinition)
* [visitEnum](_utils_src_index_.schemadirectivevisitor.md#visitenum)
* [visitEnumValue](_utils_src_index_.schemadirectivevisitor.md#visitenumvalue)
* [visitFieldDefinition](_utils_src_index_.schemadirectivevisitor.md#visitfielddefinition)
* [visitInputFieldDefinition](_utils_src_index_.schemadirectivevisitor.md#visitinputfielddefinition)
* [visitInputObject](_utils_src_index_.schemadirectivevisitor.md#visitinputobject)
* [visitInterface](_utils_src_index_.schemadirectivevisitor.md#visitinterface)
* [visitObject](_utils_src_index_.schemadirectivevisitor.md#visitobject)
* [visitScalar](_utils_src_index_.schemadirectivevisitor.md#visitscalar)
* [visitSchema](_utils_src_index_.schemadirectivevisitor.md#visitschema)
* [visitUnion](_utils_src_index_.schemadirectivevisitor.md#visitunion)
* [getDirectiveDeclaration](_utils_src_index_.schemadirectivevisitor.md#static-getdirectivedeclaration)
* [implementsVisitorMethod](_utils_src_index_.schemadirectivevisitor.md#static-implementsvisitormethod)
* [visitSchemaDirectives](_utils_src_index_.schemadirectivevisitor.md#static-visitschemadirectives)

## Properties

###  args

• **args**: *TArgs*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L71)*

___

###  context

• **context**: *TContext*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L79)*

___

###  name

• **name**: *string*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L66)*

___

###  schema

• **schema**: *GraphQLSchema*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[schema](_utils_src_index_.schemavisitor.md#schema)*

*Defined in [packages/utils/src/SchemaVisitor.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L23)*

___

###  visitedType

• **visitedType**: *[VisitableSchemaType](../modules/_utils_src_index_.md#visitableschematype)*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L74)*

## Methods

###  visitArgumentDefinition

▸ **visitArgumentDefinition**(`_argument`: GraphQLArgument, `_details`: object): *GraphQLArgument | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitArgumentDefinition](_utils_src_index_.schemavisitor.md#visitargumentdefinition)*

*Defined in [packages/utils/src/SchemaVisitor.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L79)*

**Parameters:**

▪ **_argument**: *GraphQLArgument*

▪ **_details**: *object*

Name | Type |
------ | ------ |
`field` | GraphQLField‹any, any› |
`objectType` | GraphQLObjectType &#124; GraphQLInterfaceType |

**Returns:** *GraphQLArgument | void | null*

___

###  visitEnum

▸ **visitEnum**(`_type`: GraphQLEnumType): *GraphQLEnumType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitEnum](_utils_src_index_.schemavisitor.md#visitenum)*

*Defined in [packages/utils/src/SchemaVisitor.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L97)*

**Parameters:**

Name | Type |
------ | ------ |
`_type` | GraphQLEnumType |

**Returns:** *GraphQLEnumType | void | null*

___

###  visitEnumValue

▸ **visitEnumValue**(`_value`: GraphQLEnumValue, `_details`: object): *GraphQLEnumValue | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitEnumValue](_utils_src_index_.schemavisitor.md#visitenumvalue)*

*Defined in [packages/utils/src/SchemaVisitor.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L99)*

**Parameters:**

▪ **_value**: *GraphQLEnumValue*

▪ **_details**: *object*

Name | Type |
------ | ------ |
`enumType` | GraphQLEnumType |

**Returns:** *GraphQLEnumValue | void | null*

___

###  visitFieldDefinition

▸ **visitFieldDefinition**(`_field`: GraphQLField‹any, any›, `_details`: object): *GraphQLField‹any, any› | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitFieldDefinition](_utils_src_index_.schemavisitor.md#visitfielddefinition)*

*Defined in [packages/utils/src/SchemaVisitor.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L71)*

**Parameters:**

▪ **_field**: *GraphQLField‹any, any›*

▪ **_details**: *object*

Name | Type |
------ | ------ |
`objectType` | GraphQLObjectType &#124; GraphQLInterfaceType |

**Returns:** *GraphQLField‹any, any› | void | null*

___

###  visitInputFieldDefinition

▸ **visitInputFieldDefinition**(`_field`: GraphQLInputField, `_details`: object): *GraphQLInputField | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitInputFieldDefinition](_utils_src_index_.schemavisitor.md#visitinputfielddefinition)*

*Defined in [packages/utils/src/SchemaVisitor.ts:112](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L112)*

**Parameters:**

▪ **_field**: *GraphQLInputField*

▪ **_details**: *object*

Name | Type |
------ | ------ |
`objectType` | GraphQLInputObjectType |

**Returns:** *GraphQLInputField | void | null*

___

###  visitInputObject

▸ **visitInputObject**(`_object`: GraphQLInputObjectType): *GraphQLInputObjectType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitInputObject](_utils_src_index_.schemavisitor.md#visitinputobject)*

*Defined in [packages/utils/src/SchemaVisitor.ts:107](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L107)*

**Parameters:**

Name | Type |
------ | ------ |
`_object` | GraphQLInputObjectType |

**Returns:** *GraphQLInputObjectType | void | null*

___

###  visitInterface

▸ **visitInterface**(`_iface`: GraphQLInterfaceType): *GraphQLInterfaceType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitInterface](_utils_src_index_.schemavisitor.md#visitinterface)*

*Defined in [packages/utils/src/SchemaVisitor.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L88)*

**Parameters:**

Name | Type |
------ | ------ |
`_iface` | GraphQLInterfaceType |

**Returns:** *GraphQLInterfaceType | void | null*

___

###  visitObject

▸ **visitObject**(`_object`: GraphQLObjectType): *GraphQLObjectType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitObject](_utils_src_index_.schemavisitor.md#visitobject)*

*Defined in [packages/utils/src/SchemaVisitor.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`_object` | GraphQLObjectType |

**Returns:** *GraphQLObjectType | void | null*

___

###  visitScalar

▸ **visitScalar**(`_scalar`: GraphQLScalarType): *GraphQLScalarType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitScalar](_utils_src_index_.schemavisitor.md#visitscalar)*

*Defined in [packages/utils/src/SchemaVisitor.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`_scalar` | GraphQLScalarType |

**Returns:** *GraphQLScalarType | void | null*

___

###  visitSchema

▸ **visitSchema**(`_schema`: GraphQLSchema): *void*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitSchema](_utils_src_index_.schemavisitor.md#visitschema)*

*Defined in [packages/utils/src/SchemaVisitor.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L59)*

**Parameters:**

Name | Type |
------ | ------ |
`_schema` | GraphQLSchema |

**Returns:** *void*

___

###  visitUnion

▸ **visitUnion**(`_union`: GraphQLUnionType): *GraphQLUnionType | void | null*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[visitUnion](_utils_src_index_.schemavisitor.md#visitunion)*

*Defined in [packages/utils/src/SchemaVisitor.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`_union` | GraphQLUnionType |

**Returns:** *GraphQLUnionType | void | null*

___

### `Static` getDirectiveDeclaration

▸ **getDirectiveDeclaration**(`directiveName`: string, `schema`: GraphQLSchema): *GraphQLDirective | null | undefined*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`directiveName` | string |
`schema` | GraphQLSchema |

**Returns:** *GraphQLDirective | null | undefined*

___

### `Static` implementsVisitorMethod

▸ **implementsVisitorMethod**(`methodName`: string): *boolean*

*Inherited from [SchemaVisitor](_utils_src_index_.schemavisitor).[implementsVisitorMethod](_utils_src_index_.schemavisitor.md#static-implementsvisitormethod)*

*Defined in [packages/utils/src/SchemaVisitor.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`methodName` | string |

**Returns:** *boolean*

___

### `Static` visitSchemaDirectives

▸ **visitSchemaDirectives**(`schema`: GraphQLSchema, `directiveVisitors`: Record‹string, [SchemaDirectiveVisitorClass](../modules/_utils_src_index_.md#schemadirectivevisitorclass)›, `context`: Record‹string, any›): *Record‹string, Array‹[SchemaDirectiveVisitor](_utils_src_index_.schemadirectivevisitor)››*

*Defined in [packages/utils/src/SchemaDirectiveVisitor.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaDirectiveVisitor.ts#L95)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`schema` | GraphQLSchema | - |
`directiveVisitors` | Record‹string, [SchemaDirectiveVisitorClass](../modules/_utils_src_index_.md#schemadirectivevisitorclass)› | - |
`context` | Record‹string, any› | Object.create(null) |

**Returns:** *Record‹string, Array‹[SchemaDirectiveVisitor](_utils_src_index_.schemadirectivevisitor)››*
