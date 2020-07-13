---
id: "_utils_src_index_.schemavisitor"
title: "SchemaVisitor"
sidebar_label: "SchemaVisitor"
---

## Hierarchy

* **SchemaVisitor**

  ↳ [SchemaDirectiveVisitor](_utils_src_index_.schemadirectivevisitor)

## Index

### Properties

* [schema](_utils_src_index_.schemavisitor.md#schema)

### Methods

* [visitArgumentDefinition](_utils_src_index_.schemavisitor.md#visitargumentdefinition)
* [visitEnum](_utils_src_index_.schemavisitor.md#visitenum)
* [visitEnumValue](_utils_src_index_.schemavisitor.md#visitenumvalue)
* [visitFieldDefinition](_utils_src_index_.schemavisitor.md#visitfielddefinition)
* [visitInputFieldDefinition](_utils_src_index_.schemavisitor.md#visitinputfielddefinition)
* [visitInputObject](_utils_src_index_.schemavisitor.md#visitinputobject)
* [visitInterface](_utils_src_index_.schemavisitor.md#visitinterface)
* [visitObject](_utils_src_index_.schemavisitor.md#visitobject)
* [visitScalar](_utils_src_index_.schemavisitor.md#visitscalar)
* [visitSchema](_utils_src_index_.schemavisitor.md#visitschema)
* [visitUnion](_utils_src_index_.schemavisitor.md#visitunion)
* [implementsVisitorMethod](_utils_src_index_.schemavisitor.md#static-implementsvisitormethod)

## Properties

###  schema

• **schema**: *GraphQLSchema*

*Defined in [packages/utils/src/SchemaVisitor.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L23)*

## Methods

###  visitArgumentDefinition

▸ **visitArgumentDefinition**(`_argument`: GraphQLArgument, `_details`: object): *GraphQLArgument | void | null*

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

*Defined in [packages/utils/src/SchemaVisitor.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L97)*

**Parameters:**

Name | Type |
------ | ------ |
`_type` | GraphQLEnumType |

**Returns:** *GraphQLEnumType | void | null*

___

###  visitEnumValue

▸ **visitEnumValue**(`_value`: GraphQLEnumValue, `_details`: object): *GraphQLEnumValue | void | null*

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

*Defined in [packages/utils/src/SchemaVisitor.ts:107](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L107)*

**Parameters:**

Name | Type |
------ | ------ |
`_object` | GraphQLInputObjectType |

**Returns:** *GraphQLInputObjectType | void | null*

___

###  visitInterface

▸ **visitInterface**(`_iface`: GraphQLInterfaceType): *GraphQLInterfaceType | void | null*

*Defined in [packages/utils/src/SchemaVisitor.ts:88](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L88)*

**Parameters:**

Name | Type |
------ | ------ |
`_iface` | GraphQLInterfaceType |

**Returns:** *GraphQLInterfaceType | void | null*

___

###  visitObject

▸ **visitObject**(`_object`: GraphQLObjectType): *GraphQLObjectType | void | null*

*Defined in [packages/utils/src/SchemaVisitor.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L66)*

**Parameters:**

Name | Type |
------ | ------ |
`_object` | GraphQLObjectType |

**Returns:** *GraphQLObjectType | void | null*

___

###  visitScalar

▸ **visitScalar**(`_scalar`: GraphQLScalarType): *GraphQLScalarType | void | null*

*Defined in [packages/utils/src/SchemaVisitor.ts:61](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L61)*

**Parameters:**

Name | Type |
------ | ------ |
`_scalar` | GraphQLScalarType |

**Returns:** *GraphQLScalarType | void | null*

___

###  visitSchema

▸ **visitSchema**(`_schema`: GraphQLSchema): *void*

*Defined in [packages/utils/src/SchemaVisitor.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L59)*

**Parameters:**

Name | Type |
------ | ------ |
`_schema` | GraphQLSchema |

**Returns:** *void*

___

###  visitUnion

▸ **visitUnion**(`_union`: GraphQLUnionType): *GraphQLUnionType | void | null*

*Defined in [packages/utils/src/SchemaVisitor.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`_union` | GraphQLUnionType |

**Returns:** *GraphQLUnionType | void | null*

___

### `Static` implementsVisitorMethod

▸ **implementsVisitorMethod**(`methodName`: string): *boolean*

*Defined in [packages/utils/src/SchemaVisitor.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/SchemaVisitor.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`methodName` | string |

**Returns:** *boolean*
