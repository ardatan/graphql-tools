[graphql-tools-monorepo](../README) / [utils/src](../modules/utils_src) / SchemaMapper

# Interface: SchemaMapper

[utils/src](../modules/utils_src).SchemaMapper

## Table of contents

### Properties

- [MapperKind.ABSTRACT_TYPE](utils_src.SchemaMapper#mapperkind.abstract_type)
- [MapperKind.ARGUMENT](utils_src.SchemaMapper#mapperkind.argument)
- [MapperKind.COMPOSITE_FIELD](utils_src.SchemaMapper#mapperkind.composite_field)
- [MapperKind.COMPOSITE_TYPE](utils_src.SchemaMapper#mapperkind.composite_type)
- [MapperKind.DIRECTIVE](utils_src.SchemaMapper#mapperkind.directive)
- [MapperKind.ENUM_TYPE](utils_src.SchemaMapper#mapperkind.enum_type)
- [MapperKind.ENUM_VALUE](utils_src.SchemaMapper#mapperkind.enum_value)
- [MapperKind.FIELD](utils_src.SchemaMapper#mapperkind.field)
- [MapperKind.INPUT_OBJECT_FIELD](utils_src.SchemaMapper#mapperkind.input_object_field)
- [MapperKind.INPUT_OBJECT_TYPE](utils_src.SchemaMapper#mapperkind.input_object_type)
- [MapperKind.INTERFACE_FIELD](utils_src.SchemaMapper#mapperkind.interface_field)
- [MapperKind.INTERFACE_TYPE](utils_src.SchemaMapper#mapperkind.interface_type)
- [MapperKind.MUTATION](utils_src.SchemaMapper#mapperkind.mutation)
- [MapperKind.MUTATION_ROOT_FIELD](utils_src.SchemaMapper#mapperkind.mutation_root_field)
- [MapperKind.OBJECT_FIELD](utils_src.SchemaMapper#mapperkind.object_field)
- [MapperKind.OBJECT_TYPE](utils_src.SchemaMapper#mapperkind.object_type)
- [MapperKind.QUERY](utils_src.SchemaMapper#mapperkind.query)
- [MapperKind.QUERY_ROOT_FIELD](utils_src.SchemaMapper#mapperkind.query_root_field)
- [MapperKind.ROOT_FIELD](utils_src.SchemaMapper#mapperkind.root_field)
- [MapperKind.ROOT_OBJECT](utils_src.SchemaMapper#mapperkind.root_object)
- [MapperKind.SCALAR_TYPE](utils_src.SchemaMapper#mapperkind.scalar_type)
- [MapperKind.SUBSCRIPTION](utils_src.SchemaMapper#mapperkind.subscription)
- [MapperKind.SUBSCRIPTION_ROOT_FIELD](utils_src.SchemaMapper#mapperkind.subscription_root_field)
- [MapperKind.TYPE](utils_src.SchemaMapper#mapperkind.type)
- [MapperKind.UNION_TYPE](utils_src.SchemaMapper#mapperkind.union_type)

## Properties

### MapperKind.ABSTRACT_TYPE

• `Optional` **MapperKind.ABSTRACT_TYPE**:
[`AbstractTypeMapper`](../modules/utils_src#abstracttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:391](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L391)

---

### MapperKind.ARGUMENT

• `Optional` **MapperKind.ARGUMENT**: [`ArgumentMapper`](../modules/utils_src#argumentmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:407](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L407)

---

### MapperKind.COMPOSITE_FIELD

• `Optional` **MapperKind.COMPOSITE_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:406](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L406)

---

### MapperKind.COMPOSITE_TYPE

• `Optional` **MapperKind.COMPOSITE_TYPE**:
[`CompositeTypeMapper`](../modules/utils_src#compositetypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:388](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L388)

---

### MapperKind.DIRECTIVE

• `Optional` **MapperKind.DIRECTIVE**: [`DirectiveMapper`](../modules/utils_src#directivemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:409](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L409)

---

### MapperKind.ENUM_TYPE

• `Optional` **MapperKind.ENUM_TYPE**: [`EnumTypeMapper`](../modules/utils_src#enumtypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:387](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L387)

---

### MapperKind.ENUM_VALUE

• `Optional` **MapperKind.ENUM_VALUE**: [`EnumValueMapper`](../modules/utils_src#enumvaluemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:398](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L398)

---

### MapperKind.FIELD

• `Optional` **MapperKind.FIELD**:
[`GenericFieldMapper`](../modules/utils_src#genericfieldmapper)\<`GraphQLInputFieldConfig` \|
`GraphQLFieldConfig`\<`any`, `any`, `any`>>

#### Defined in

[packages/utils/src/Interfaces.ts:399](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L399)

---

### MapperKind.INPUT_OBJECT_FIELD

• `Optional` **MapperKind.INPUT_OBJECT_FIELD**:
[`InputFieldMapper`](../modules/utils_src#inputfieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:408](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L408)

---

### MapperKind.INPUT_OBJECT_TYPE

• `Optional` **MapperKind.INPUT_OBJECT_TYPE**:
[`InputObjectTypeMapper`](../modules/utils_src#inputobjecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:390](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L390)

---

### MapperKind.INTERFACE_FIELD

• `Optional` **MapperKind.INTERFACE_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:405](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L405)

---

### MapperKind.INTERFACE_TYPE

• `Optional` **MapperKind.INTERFACE_TYPE**:
[`InterfaceTypeMapper`](../modules/utils_src#interfacetypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:393](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L393)

---

### MapperKind.MUTATION

• `Optional` **MapperKind.MUTATION**: [`ObjectTypeMapper`](../modules/utils_src#objecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:396](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L396)

---

### MapperKind.MUTATION_ROOT_FIELD

• `Optional` **MapperKind.MUTATION_ROOT_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:403](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L403)

---

### MapperKind.OBJECT_FIELD

• `Optional` **MapperKind.OBJECT_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:400](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L400)

---

### MapperKind.OBJECT_TYPE

• `Optional` **MapperKind.OBJECT_TYPE**: [`ObjectTypeMapper`](../modules/utils_src#objecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:389](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L389)

---

### MapperKind.QUERY

• `Optional` **MapperKind.QUERY**: [`ObjectTypeMapper`](../modules/utils_src#objecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:395](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L395)

---

### MapperKind.QUERY_ROOT_FIELD

• `Optional` **MapperKind.QUERY_ROOT_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:402](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L402)

---

### MapperKind.ROOT_FIELD

• `Optional` **MapperKind.ROOT_FIELD**: [`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:401](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L401)

---

### MapperKind.ROOT_OBJECT

• `Optional` **MapperKind.ROOT_OBJECT**: [`ObjectTypeMapper`](../modules/utils_src#objecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:394](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L394)

---

### MapperKind.SCALAR_TYPE

• `Optional` **MapperKind.SCALAR_TYPE**: [`ScalarTypeMapper`](../modules/utils_src#scalartypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:386](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L386)

---

### MapperKind.SUBSCRIPTION

• `Optional` **MapperKind.SUBSCRIPTION**:
[`ObjectTypeMapper`](../modules/utils_src#objecttypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:397](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L397)

---

### MapperKind.SUBSCRIPTION_ROOT_FIELD

• `Optional` **MapperKind.SUBSCRIPTION_ROOT_FIELD**:
[`FieldMapper`](../modules/utils_src#fieldmapper)

#### Defined in

[packages/utils/src/Interfaces.ts:404](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L404)

---

### MapperKind.TYPE

• `Optional` **MapperKind.TYPE**: [`NamedTypeMapper`](../modules/utils_src#namedtypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:385](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L385)

---

### MapperKind.UNION_TYPE

• `Optional` **MapperKind.UNION_TYPE**: [`UnionTypeMapper`](../modules/utils_src#uniontypemapper)

#### Defined in

[packages/utils/src/Interfaces.ts:392](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/Interfaces.ts#L392)
