[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) / ExecutionArgs

# Interface: ExecutionArgs<TData, TVariables, TContext\>

[executor/src](../modules/executor_src).ExecutionArgs

## Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TData`      | `any` |
| `TVariables` | `any` |
| `TContext`   | `any` |

## Table of contents

### Properties

- [contextValue](executor_src.ExecutionArgs#contextvalue)
- [document](executor_src.ExecutionArgs#document)
- [fieldResolver](executor_src.ExecutionArgs#fieldresolver)
- [operationName](executor_src.ExecutionArgs#operationname)
- [rootValue](executor_src.ExecutionArgs#rootvalue)
- [schema](executor_src.ExecutionArgs#schema)
- [signal](executor_src.ExecutionArgs#signal)
- [subscribeFieldResolver](executor_src.ExecutionArgs#subscribefieldresolver)
- [typeResolver](executor_src.ExecutionArgs#typeresolver)
- [variableValues](executor_src.ExecutionArgs#variablevalues)

## Properties

### contextValue

• `Optional` **contextValue**: `TContext`

#### Defined in

[packages/executor/src/execution/execute.ts:237](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L237)

---

### document

• **document**: `TypedDocumentNode`\<`TData`, `TVariables`>

#### Defined in

[packages/executor/src/execution/execute.ts:235](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L235)

---

### fieldResolver

• `Optional` **fieldResolver**:
[`Maybe`](../modules/utils_src#maybe)\<`GraphQLFieldResolver`\<`any`, `TContext`>>

#### Defined in

[packages/executor/src/execution/execute.ts:240](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L240)

---

### operationName

• `Optional` **operationName**: [`Maybe`](../modules/utils_src#maybe)\<`string`>

#### Defined in

[packages/executor/src/execution/execute.ts:239](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L239)

---

### rootValue

• `Optional` **rootValue**: `unknown`

#### Defined in

[packages/executor/src/execution/execute.ts:236](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L236)

---

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/executor/src/execution/execute.ts:234](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L234)

---

### signal

• `Optional` **signal**: `AbortSignal`

#### Defined in

[packages/executor/src/execution/execute.ts:243](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L243)

---

### subscribeFieldResolver

• `Optional` **subscribeFieldResolver**:
[`Maybe`](../modules/utils_src#maybe)\<`GraphQLFieldResolver`\<`any`, `TContext`>>

#### Defined in

[packages/executor/src/execution/execute.ts:242](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L242)

---

### typeResolver

• `Optional` **typeResolver**: [`Maybe`](../modules/utils_src#maybe)\<`GraphQLTypeResolver`\<`any`,
`TContext`>>

#### Defined in

[packages/executor/src/execution/execute.ts:241](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L241)

---

### variableValues

• `Optional` **variableValues**: `TVariables`

#### Defined in

[packages/executor/src/execution/execute.ts:238](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L238)
