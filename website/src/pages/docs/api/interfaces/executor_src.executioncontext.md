[graphql-tools-monorepo](../README) / [executor/src](../modules/executor_src) / ExecutionContext

# Interface: ExecutionContext<TVariables, TContext\>

[executor/src](../modules/executor_src).ExecutionContext

Data that must be available at all points during query execution.

Namely, schema of the type system that is currently executing, and the fragments defined in the
query document

## Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TVariables` | `any` |
| `TContext`   | `any` |

## Table of contents

### Properties

- [contextValue](executor_src.ExecutionContext#contextvalue)
- [errors](executor_src.ExecutionContext#errors)
- [fieldResolver](executor_src.ExecutionContext#fieldresolver)
- [fragments](executor_src.ExecutionContext#fragments)
- [operation](executor_src.ExecutionContext#operation)
- [rootValue](executor_src.ExecutionContext#rootvalue)
- [schema](executor_src.ExecutionContext#schema)
- [signal](executor_src.ExecutionContext#signal)
- [subscribeFieldResolver](executor_src.ExecutionContext#subscribefieldresolver)
- [subsequentPayloads](executor_src.ExecutionContext#subsequentpayloads)
- [typeResolver](executor_src.ExecutionContext#typeresolver)
- [variableValues](executor_src.ExecutionContext#variablevalues)

## Properties

### contextValue

• **contextValue**: `TContext`

#### Defined in

[packages/executor/src/execution/execute.ts:115](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L115)

---

### errors

• **errors**: `GraphQLError`[]

#### Defined in

[packages/executor/src/execution/execute.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L121)

---

### fieldResolver

• **fieldResolver**: `GraphQLFieldResolver`\<`any`, `TContext`>

#### Defined in

[packages/executor/src/execution/execute.ts:118](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L118)

---

### fragments

• **fragments**: `Record`\<`string`, `FragmentDefinitionNode`>

#### Defined in

[packages/executor/src/execution/execute.ts:113](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L113)

---

### operation

• **operation**: `OperationDefinitionNode`

#### Defined in

[packages/executor/src/execution/execute.ts:116](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L116)

---

### rootValue

• **rootValue**: `unknown`

#### Defined in

[packages/executor/src/execution/execute.ts:114](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L114)

---

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/executor/src/execution/execute.ts:112](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L112)

---

### signal

• `Optional` **signal**: `AbortSignal`

#### Defined in

[packages/executor/src/execution/execute.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L123)

---

### subscribeFieldResolver

• **subscribeFieldResolver**: `GraphQLFieldResolver`\<`any`, `TContext`>

#### Defined in

[packages/executor/src/execution/execute.ts:120](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L120)

---

### subsequentPayloads

• **subsequentPayloads**: `Set`\<`AsyncPayloadRecord`>

#### Defined in

[packages/executor/src/execution/execute.ts:122](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L122)

---

### typeResolver

• **typeResolver**: `GraphQLTypeResolver`\<`any`, `TContext`>

#### Defined in

[packages/executor/src/execution/execute.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L119)

---

### variableValues

• **variableValues**: `TVariables`

#### Defined in

[packages/executor/src/execution/execute.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L117)
