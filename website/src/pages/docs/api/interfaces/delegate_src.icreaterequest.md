[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / ICreateRequest

# Interface: ICreateRequest

[delegate/src](../modules/delegate_src).ICreateRequest

## Table of contents

### Properties

- [context](delegate_src.ICreateRequest#context)
- [fieldNodes](delegate_src.ICreateRequest#fieldnodes)
- [fragments](delegate_src.ICreateRequest#fragments)
- [info](delegate_src.ICreateRequest#info)
- [selectionSet](delegate_src.ICreateRequest#selectionset)
- [sourceFieldName](delegate_src.ICreateRequest#sourcefieldname)
- [sourceParentType](delegate_src.ICreateRequest#sourceparenttype)
- [sourceSchema](delegate_src.ICreateRequest#sourceschema)
- [targetFieldName](delegate_src.ICreateRequest#targetfieldname)
- [targetOperation](delegate_src.ICreateRequest#targetoperation)
- [targetOperationName](delegate_src.ICreateRequest#targetoperationname)
- [targetRootValue](delegate_src.ICreateRequest#targetrootvalue)
- [variableDefinitions](delegate_src.ICreateRequest#variabledefinitions)
- [variableValues](delegate_src.ICreateRequest#variablevalues)

## Properties

### context

• `Optional` **context**: `any`

#### Defined in

[packages/delegate/src/types.ts:104](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L104)

---

### fieldNodes

• `Optional` **fieldNodes**: readonly `FieldNode`[]

#### Defined in

[packages/delegate/src/types.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L103)

---

### fragments

• `Optional` **fragments**: `Record`\<`string`, `FragmentDefinitionNode`>

#### Defined in

[packages/delegate/src/types.ts:95](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L95)

---

### info

• `Optional` **info**: `GraphQLResolveInfo`

#### Defined in

[packages/delegate/src/types.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L105)

---

### selectionSet

• `Optional` **selectionSet**: `SelectionSetNode`

#### Defined in

[packages/delegate/src/types.ts:102](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L102)

---

### sourceFieldName

• `Optional` **sourceFieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L94)

---

### sourceParentType

• `Optional` **sourceParentType**: `GraphQLObjectType`\<`any`, `any`>

#### Defined in

[packages/delegate/src/types.ts:93](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L93)

---

### sourceSchema

• `Optional` **sourceSchema**: `GraphQLSchema`

#### Defined in

[packages/delegate/src/types.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L92)

---

### targetFieldName

• **targetFieldName**: `string`

#### Defined in

[packages/delegate/src/types.ts:101](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L101)

---

### targetOperation

• **targetOperation**: `OperationTypeNode`

#### Defined in

[packages/delegate/src/types.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L98)

---

### targetOperationName

• `Optional` **targetOperationName**: `string`

#### Defined in

[packages/delegate/src/types.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L100)

---

### targetRootValue

• `Optional` **targetRootValue**: `any`

#### Defined in

[packages/delegate/src/types.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L99)

---

### variableDefinitions

• `Optional` **variableDefinitions**: readonly `VariableDefinitionNode`[]

#### Defined in

[packages/delegate/src/types.ts:96](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L96)

---

### variableValues

• `Optional` **variableValues**: `Record`\<`string`, `any`>

#### Defined in

[packages/delegate/src/types.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L97)
