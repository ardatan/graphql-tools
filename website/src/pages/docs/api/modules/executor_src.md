# @graphql-tools/executor

### Interfaces

- [ExecutionArgs](/docs/api/interfaces/executor_src.ExecutionArgs)
- [ExecutionContext](/docs/api/interfaces/executor_src.ExecutionContext)
- [FormattedExecutionResult](/docs/api/interfaces/executor_src.FormattedExecutionResult)
- [FormattedIncrementalDeferResult](/docs/api/interfaces/executor_src.FormattedIncrementalDeferResult)
- [FormattedIncrementalStreamResult](/docs/api/interfaces/executor_src.FormattedIncrementalStreamResult)
- [FormattedInitialIncrementalExecutionResult](/docs/api/interfaces/executor_src.FormattedInitialIncrementalExecutionResult)
- [FormattedSubsequentIncrementalExecutionResult](/docs/api/interfaces/executor_src.FormattedSubsequentIncrementalExecutionResult)
- [IncrementalDeferResult](/docs/api/interfaces/executor_src.IncrementalDeferResult)
- [IncrementalExecutionResults](/docs/api/interfaces/executor_src.IncrementalExecutionResults)
- [IncrementalStreamResult](/docs/api/interfaces/executor_src.IncrementalStreamResult)
- [InitialIncrementalExecutionResult](/docs/api/interfaces/executor_src.InitialIncrementalExecutionResult)
- [SingularExecutionResult](/docs/api/interfaces/executor_src.SingularExecutionResult)
- [SubsequentIncrementalExecutionResult](/docs/api/interfaces/executor_src.SubsequentIncrementalExecutionResult)

### Type Aliases

- [FormattedIncrementalResult](executor_src#formattedincrementalresult)
- [IncrementalResult](executor_src#incrementalresult)

### Functions

- [assertValidExecutionArguments](executor_src#assertvalidexecutionarguments)
- [buildExecutionContext](executor_src#buildexecutioncontext)
- [buildResolveInfo](executor_src#buildresolveinfo)
- [defaultFieldResolver](executor_src#defaultfieldresolver)
- [defaultTypeResolver](executor_src#defaulttyperesolver)
- [execute](executor_src#execute)
- [executeSync](executor_src#executesync)
- [flattenIncrementalResults](executor_src#flattenincrementalresults)
- [getFieldDef](executor_src#getfielddef)
- [getFragmentsFromDocument](executor_src#getfragmentsfromdocument)
- [getVariableValues](executor_src#getvariablevalues)
- [isIncrementalResult](executor_src#isincrementalresult)
- [normalizedExecutor](executor_src#normalizedexecutor)
- [subscribe](executor_src#subscribe)

## Type Aliases

### FormattedIncrementalResult

Ƭ **FormattedIncrementalResult**\<`TData`, `TExtensions`>:
[`FormattedIncrementalDeferResult`](/docs/api/interfaces/executor_src.FormattedIncrementalDeferResult)\<`TData`,
`TExtensions`> \|
[`FormattedIncrementalStreamResult`](/docs/api/interfaces/executor_src.FormattedIncrementalStreamResult)\<`TData`,
`TExtensions`>

#### Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

#### Defined in

[packages/executor/src/execution/execute.ts:226](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L226)

---

### IncrementalResult

Ƭ **IncrementalResult**\<`TData`, `TExtensions`>:
[`IncrementalDeferResult`](/docs/api/interfaces/executor_src.IncrementalDeferResult)\<`TData`,
`TExtensions`> \|
[`IncrementalStreamResult`](/docs/api/interfaces/executor_src.IncrementalStreamResult)\<`TData`,
`TExtensions`>

#### Type parameters

| Name          | Type                           |
| :------------ | :----------------------------- |
| `TData`       | `Record`\<`string`, `unknown`> |
| `TExtensions` | `Record`\<`string`, `unknown`> |

#### Defined in

[packages/executor/src/execution/execute.ts:221](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L221)

## Functions

### assertValidExecutionArguments

▸ **assertValidExecutionArguments**<`TVariables`\>(`schema`, `document`, `rawVariableValues`):
`void`

Essential assertions before executing to provide developer feedback for improper use of the GraphQL
library.

#### Type parameters

| Name         |
| :----------- |
| `TVariables` |

#### Parameters

| Name                | Type                                      |
| :------------------ | :---------------------------------------- |
| `schema`            | `GraphQLSchema`                           |
| `document`          | `TypedDocumentNode`\<`any`, `TVariables`> |
| `rawVariableValues` | [`Maybe`](utils_src#maybe)\<`TVariables`> |

#### Returns

`void`

#### Defined in

[packages/executor/src/execution/execute.ts:356](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L356)

---

### buildExecutionContext

▸ **buildExecutionContext**<`TData`, `TVariables`, `TContext`\>(`args`):
`ReadonlyArray`\<`GraphQLError`> \|
[`ExecutionContext`](/docs/api/interfaces/executor_src.ExecutionContext)

Constructs a ExecutionContext object from the arguments passed to execute, which we will pass
throughout the other execution methods.

Throws a GraphQLError if a valid execution context cannot be created.

TODO: consider no longer exporting this function

#### Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TData`      | `any` |
| `TVariables` | `any` |
| `TContext`   | `any` |

#### Parameters

| Name   | Type                                                                                                   |
| :----- | :----------------------------------------------------------------------------------------------------- |
| `args` | [`ExecutionArgs`](/docs/api/interfaces/executor_src.ExecutionArgs)\<`TData`, `TVariables`, `TContext`> |

#### Returns

`ReadonlyArray`\<`GraphQLError`> \|
[`ExecutionContext`](/docs/api/interfaces/executor_src.ExecutionContext)

#### Defined in

[packages/executor/src/execution/execute.ts:394](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L394)

---

### buildResolveInfo

▸ **buildResolveInfo**(`exeContext`, `fieldDef`, `fieldNodes`, `parentType`, `path`):
`GraphQLResolveInfo`

TODO: consider no longer exporting this function

#### Parameters

| Name         | Type                                                                                    |
| :----------- | :-------------------------------------------------------------------------------------- |
| `exeContext` | [`ExecutionContext`](/docs/api/interfaces/executor_src.ExecutionContext)\<`any`, `any`> |
| `fieldDef`   | `GraphQLField`\<`unknown`, `unknown`, `any`>                                            |
| `fieldNodes` | `FieldNode`[]                                                                           |
| `parentType` | `GraphQLObjectType`\<`any`, `any`>                                                      |
| `path`       | [`Path`](/docs/api/interfaces/utils_src.Path)                                           |

#### Returns

`GraphQLResolveInfo`

#### Defined in

[packages/executor/src/execution/execute.ts:722](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L722)

---

### defaultFieldResolver

▸ **defaultFieldResolver**(`source`, `args`, `context`, `info`): `unknown`

If a resolve function is not given, then a default resolve behavior is used which takes the property
of the source object of the same name as the field and returns it as the result, or if it's a
function, returns the result of calling that function while passing along args and context value.

#### Parameters

| Name      | Type                 |
| :-------- | :------------------- |
| `source`  | `unknown`            |
| `args`    | `any`                |
| `context` | `unknown`            |
| `info`    | `GraphQLResolveInfo` |

#### Returns

`unknown`

#### Defined in

node_modules/graphql/type/definition.d.ts:494

---

### defaultTypeResolver

▸ **defaultTypeResolver**(`value`, `context`, `info`, `abstractType`): `PromiseOrValue`\<`undefined`
\| `string`>

If a resolveType function is not given, then a default resolve behavior is used which attempts two
strategies:

First, See if the provided value has a `__typename` field defined, if so, use that value as name of
the resolved type.

Otherwise, test each possible type for the abstract type by calling isTypeOf for the object being
coerced, returning the first type that matches.

#### Parameters

| Name           | Type                  |
| :------------- | :-------------------- |
| `value`        | `unknown`             |
| `context`      | `unknown`             |
| `info`         | `GraphQLResolveInfo`  |
| `abstractType` | `GraphQLAbstractType` |

#### Returns

`PromiseOrValue`\<`undefined` \| `string`>

#### Defined in

node_modules/graphql/type/definition.d.ts:478

---

### execute

▸ **execute**<`TData`, `TVariables`, `TContext`\>(`args`):
[`MaybePromise`](utils_src#maybepromise)\<[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>
\|
[`IncrementalExecutionResults`](/docs/api/interfaces/executor_src.IncrementalExecutionResults)\<`TData`>>

Implements the "Executing requests" section of the GraphQL specification, including `@defer` and
`@stream` as proposed in https://github.com/graphql/graphql-spec/pull/742

This function returns a Promise of an IncrementalExecutionResults object. This object either
consists of a single ExecutionResult, or an object containing an `initialResult` and a stream of
`subsequentResults`.

If the arguments to this function do not result in a legal execution context, a GraphQLError will be
thrown immediately explaining the invalid input.

#### Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TData`      | `any` |
| `TVariables` | `any` |
| `TContext`   | `any` |

#### Parameters

| Name   | Type                                                                                                   |
| :----- | :----------------------------------------------------------------------------------------------------- |
| `args` | [`ExecutionArgs`](/docs/api/interfaces/executor_src.ExecutionArgs)\<`TData`, `TVariables`, `TContext`> |

#### Returns

[`MaybePromise`](utils_src#maybepromise)\<[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>
\|
[`IncrementalExecutionResults`](/docs/api/interfaces/executor_src.IncrementalExecutionResults)\<`TData`>>

#### Defined in

[packages/executor/src/execution/execute.ts:258](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L258)

---

### executeSync

▸ **executeSync**(`args`):
[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)

Also implements the "Executing requests" section of the GraphQL specification. However, it
guarantees to complete synchronously (or throw an error) assuming that all field resolvers are also
synchronous.

#### Parameters

| Name   | Type                                                                                     |
| :----- | :--------------------------------------------------------------------------------------- |
| `args` | [`ExecutionArgs`](/docs/api/interfaces/executor_src.ExecutionArgs)\<`any`, `any`, `any`> |

#### Returns

[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)

#### Defined in

[packages/executor/src/execution/execute.ts:328](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L328)

---

### flattenIncrementalResults

▸ **flattenIncrementalResults**<`TData`\>(`incrementalResults`, `signal?`):
`AsyncGenerator`\<[`SubsequentIncrementalExecutionResult`](/docs/api/interfaces/executor_src.SubsequentIncrementalExecutionResult)\<`TData`,
`Record`\<`string`, `unknown`>>, `void`, `void`>

#### Type parameters

| Name    |
| :------ |
| `TData` |

#### Parameters

| Name                 | Type                                                                                                                                     |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `incrementalResults` | [`IncrementalExecutionResults`](/docs/api/interfaces/executor_src.IncrementalExecutionResults)\<`TData`, `Record`\<`string`, `unknown`>> |
| `signal?`            | `AbortSignal`                                                                                                                            |

#### Returns

`AsyncGenerator`\<[`SubsequentIncrementalExecutionResult`](/docs/api/interfaces/executor_src.SubsequentIncrementalExecutionResult)\<`TData`,
`Record`\<`string`, `unknown`>>, `void`, `void`>

#### Defined in

[packages/executor/src/execution/execute.ts:1540](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L1540)

---

### getFieldDef

▸ **getFieldDef**(`schema`, `parentType`, `fieldNode`):
[`Maybe`](utils_src#maybe)\<`GraphQLField`\<`unknown`, `unknown`>>

This method looks up the field on the given type definition. It has special casing for the three
introspection fields, **schema, **type and **typename. **typename is special because it can always
be queried as a field, even in situations where no other fields are allowed, like on a Union.
**schema and **type could get automatically added to the query type, but that would require mutating
type definitions, which would cause issues.

#### Parameters

| Name         | Type                               |
| :----------- | :--------------------------------- |
| `schema`     | `GraphQLSchema`                    |
| `parentType` | `GraphQLObjectType`\<`any`, `any`> |
| `fieldNode`  | `FieldNode`                        |

#### Returns

[`Maybe`](utils_src#maybe)\<`GraphQLField`\<`unknown`, `unknown`>>

#### Defined in

[packages/executor/src/execution/execute.ts:2233](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L2233)

---

### getFragmentsFromDocument

▸ **getFragmentsFromDocument**(`document`): `Record`\<`string`, `FragmentDefinitionNode`>

#### Parameters

| Name       | Type           |
| :--------- | :------------- |
| `document` | `DocumentNode` |

#### Returns

`Record`\<`string`, `FragmentDefinitionNode`>

#### Defined in

[packages/executor/src/execution/execute.ts:373](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L373)

---

### getVariableValues

▸ **getVariableValues**(`schema`, `varDefNodes`, `inputs`, `options?`): `CoercedVariableValues`

Prepares an object map of variableValues of the correct type based on the provided variable
definitions and arbitrary input. If the input cannot be parsed to match the variable definitions, a
GraphQLError will be thrown.

Note: The returned value is a plain Object with a prototype, since it is exposed to user code. Care
should be taken to not pull values from the Object prototype.

#### Parameters

| Name                 | Type                                |
| :------------------- | :---------------------------------- |
| `schema`             | `GraphQLSchema`                     |
| `varDefNodes`        | readonly `VariableDefinitionNode`[] |
| `inputs`             | `Object`                            |
| `options?`           | `Object`                            |
| `options.maxErrors?` | `number`                            |

#### Returns

`CoercedVariableValues`

#### Defined in

[packages/executor/src/execution/values.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/values.ts#L28)

---

### isIncrementalResult

▸ **isIncrementalResult**<`TData`\>(`result`): result is IncrementalExecutionResults\<TData,
Record\<string, unknown>>

#### Type parameters

| Name    |
| :------ |
| `TData` |

#### Parameters

| Name     | Type                                                                                                                                                                                                                                                |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `result` | [`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`, `any`> \| [`IncrementalExecutionResults`](/docs/api/interfaces/executor_src.IncrementalExecutionResults)\<`TData`, `Record`\<`string`, `unknown`>> |

#### Returns

result is IncrementalExecutionResults\<TData, Record\<string, unknown>>

#### Defined in

[packages/executor/src/execution/execute.ts:2250](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L2250)

---

### normalizedExecutor

▸ **normalizedExecutor**<`TData`, `TVariables`, `TContext`\>(`args`):
[`MaybePromise`](utils_src#maybepromise)\<[`MaybeAsyncIterable`](utils_src#maybeasynciterable)\<[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`TData`>>>

#### Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TData`      | `any` |
| `TVariables` | `any` |
| `TContext`   | `any` |

#### Parameters

| Name   | Type                                                                                                   |
| :----- | :----------------------------------------------------------------------------------------------------- |
| `args` | [`ExecutionArgs`](/docs/api/interfaces/executor_src.ExecutionArgs)\<`TData`, `TVariables`, `TContext`> |

#### Returns

[`MaybePromise`](utils_src#maybepromise)\<[`MaybeAsyncIterable`](utils_src#maybeasynciterable)\<[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`TData`>>>

#### Defined in

[packages/executor/src/execution/normalizedExecutor.ts:6](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/normalizedExecutor.ts#L6)

---

### subscribe

▸ **subscribe**<`TData`, `TVariables`, `TContext`\>(`args`):
[`MaybePromise`](utils_src#maybepromise)\<`AsyncGenerator`\<[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>
\|
[`InitialIncrementalExecutionResult`](/docs/api/interfaces/executor_src.InitialIncrementalExecutionResult)\<`TData`>
\|
[`SubsequentIncrementalExecutionResult`](/docs/api/interfaces/executor_src.SubsequentIncrementalExecutionResult)\<`TData`>,
`void`, `void`> \|
[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>>

Implements the "Subscribe" algorithm described in the GraphQL specification, including `@defer` and
`@stream` as proposed in https://github.com/graphql/graphql-spec/pull/742

Returns a Promise which resolves to either an AsyncIterator (if successful) or an ExecutionResult
(error). The promise will be rejected if the schema or other arguments to this function are invalid,
or if the resolved event stream is not an async iterable.

If the client-provided arguments to this function do not result in a compliant subscription, a
GraphQL Response (ExecutionResult) with descriptive errors and no data will be returned.

If the source stream could not be created due to faulty subscription resolver logic or underlying
systems, the promise will resolve to a single ExecutionResult containing `errors` and no `data`.

If the operation succeeded, the promise resolves to an AsyncIterator, which yields a stream of
result representing the response stream.

Each result may be an ExecutionResult with no `hasNext` (if executing the event did not use `@defer`
or `@stream`), or an `InitialIncrementalExecutionResult` or `SubsequentIncrementalExecutionResult`
(if executing the event used `@defer` or `@stream`). In the case of incremental execution results,
each event produces a single `InitialIncrementalExecutionResult` followed by one or more
`SubsequentIncrementalExecutionResult`s; all but the last have `hasNext: true`, and the last has
`hasNext: false`. There is no interleaving between results generated from the same original event.

Accepts an object with named arguments.

#### Type parameters

| Name         | Type  |
| :----------- | :---- |
| `TData`      | `any` |
| `TVariables` | `any` |
| `TContext`   | `any` |

#### Parameters

| Name   | Type                                                                                                   |
| :----- | :----------------------------------------------------------------------------------------------------- |
| `args` | [`ExecutionArgs`](/docs/api/interfaces/executor_src.ExecutionArgs)\<`TData`, `TVariables`, `TContext`> |

#### Returns

[`MaybePromise`](utils_src#maybepromise)\<`AsyncGenerator`\<[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>
\|
[`InitialIncrementalExecutionResult`](/docs/api/interfaces/executor_src.InitialIncrementalExecutionResult)\<`TData`>
\|
[`SubsequentIncrementalExecutionResult`](/docs/api/interfaces/executor_src.SubsequentIncrementalExecutionResult)\<`TData`>,
`void`, `void`> \|
[`SingularExecutionResult`](/docs/api/interfaces/executor_src.SingularExecutionResult)\<`TData`>>

#### Defined in

[packages/executor/src/execution/execute.ts:1495](https://github.com/ardatan/graphql-tools/blob/master/packages/executor/src/execution/execute.ts#L1495)
