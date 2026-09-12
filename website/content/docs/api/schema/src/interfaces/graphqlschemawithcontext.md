---
title: "GraphQLSchemaWithContext"
description: "The GraphQLSchemaWithContext interface exported by @graphql-tools/schema."
---

Defined in: [packages/schema/src/types.ts:10](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L10)

## Extends

- `GraphQLSchema`

## Type Parameters

### TContext

`TContext`

## Properties

### \_\_context?

> `optional` **\_\_context?**: `TContext`

Defined in: [packages/schema/src/types.ts:11](https://github.com/ardatan/graphql-tools/blob/master/packages/schema/src/types.ts#L11)

***

### assumeValid

> **assumeValid**: `boolean`

Defined in: node\_modules/graphql/type/schema.d.mts:153

Whether this schema instance skips validation checks.

#### Inherited from

`GraphQLSchema.assumeValid`

***

### astNode

> **astNode**: `Maybe`\<`SchemaDefinitionNode`\>

Defined in: node\_modules/graphql/type/schema.d.mts:149

AST node from which this schema element was built, if available.

#### Inherited from

`GraphQLSchema.astNode`

***

### description

> **description**: `Maybe`\<`string`\>

Defined in: node\_modules/graphql/type/schema.d.mts:145

Human-readable description for this schema element, if provided.

#### Inherited from

`GraphQLSchema.description`

***

### extensionASTNodes

> **extensionASTNodes**: readonly `SchemaExtensionNode`[]

Defined in: node\_modules/graphql/type/schema.d.mts:151

AST extension nodes applied to this schema element.

#### Inherited from

`GraphQLSchema.extensionASTNodes`

***

### extensions

> **extensions**: `Readonly`\<`GraphQLSchemaExtensions`\>

Defined in: node\_modules/graphql/type/schema.d.mts:147

Custom extension fields reserved for users.

#### Inherited from

`GraphQLSchema.extensions`

## Accessors

### \[toStringTag\]

#### Get Signature

> **get** **\[toStringTag\]**(): `string`

Defined in: node\_modules/graphql/type/schema.d.mts:255

Returns the value used by `Object.prototype.toString`.

##### Returns

`string`

The built-in string tag for this object.

#### Inherited from

`GraphQLSchema.[toStringTag]`

## Methods

### getDirective()

> **getDirective**(`name`): `Maybe`\<`GraphQLDirective`\>

Defined in: node\_modules/graphql/type/schema.d.mts:543

Returns the current directive definition.

#### Parameters

##### name

`string`

The GraphQL name to look up.

#### Returns

`Maybe`\<`GraphQLDirective`\>

The current directive definition, if known.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  directive @upper on FIELD_DEFINITION

  type Query {
    greeting: String @upper
  }
`);

schema.getDirective('upper')?.name; // => 'upper'
schema.getDirective('missing'); // => undefined
```

#### Inherited from

`GraphQLSchema.getDirective`

***

### getDirectives()

> **getDirectives**(): readonly `GraphQLDirective`[]

Defined in: node\_modules/graphql/type/schema.d.mts:522

Returns directives available in this schema.

#### Returns

readonly `GraphQLDirective`[]

Directives available in this schema.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  directive @upper on FIELD_DEFINITION

  type Query {
    greeting: String @upper
  }
`);

schema.getDirectives().map((directive) => directive.name); // => ['include', 'skip', 'deprecated', 'specifiedBy', 'oneOf', 'upper']
```

#### Inherited from

`GraphQLSchema.getDirectives`

***

### getField()

> **getField**(`parentType`, `fieldName`): `GraphQLField`\<`unknown`, `unknown`, `any`\> \| `undefined`

Defined in: node\_modules/graphql/type/schema.d.mts:573

This method looks up the field on the given type definition.
It has special casing for the three introspection fields, `__schema`,
`__type` and `__typename`.

`__typename` is special because it can always be queried as a field, even
in situations where no other fields are allowed, like on a Union.

`__schema` and `__type` could get automatically added to the query type,
but that would require mutating type definitions, which would cause issues.

#### Parameters

##### parentType

`GraphQLCompositeType`

Composite type to look up the field on.

##### fieldName

`string`

Field name to look up.

#### Returns

`GraphQLField`\<`unknown`, `unknown`, `any`\> \| `undefined`

The field definition, including supported introspection fields.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type Query {
    greeting: String
  }
`);
const queryType = schema.getQueryType();

schema.getField(queryType, 'greeting')?.name; // => 'greeting'
schema.getField(queryType, '__typename')?.name; // => '__typename'
schema.getField(queryType, 'missing'); // => undefined
```

#### Inherited from

`GraphQLSchema.getField`

***

### getImplementations()

> **getImplementations**(`interfaceType`): `object`

Defined in: node\_modules/graphql/type/schema.d.mts:462

Returns objects and interfaces that implement an interface type.

#### Parameters

##### interfaceType

`GraphQLInterfaceType`

Interface type to inspect.

#### Returns

`object`

Object and interface implementations of the interface.

##### interfaces

> **interfaces**: readonly `GraphQLInterfaceType`\<`any`, `any`\>[]

##### objects

> **objects**: readonly `GraphQLObjectType`\<`any`, `any`, `any`\>[]

#### Example

```ts
import { buildSchema } from 'graphql/utilities';
import { assertInterfaceType } from 'graphql/type';

const schema = buildSchema(`
  interface Resource {
    url: String!
  }

  interface Image implements Resource {
    url: String!
    width: Int
  }

  type Photo implements Resource & Image {
    url: String!
    width: Int
  }

  type Query {
    resource: Resource
  }
`);

const Resource = assertInterfaceType(schema.getType('Resource'));
const implementations = schema.getImplementations(Resource);

implementations.interfaces.map((type) => type.name); // => ['Image']
implementations.objects.map((type) => type.name); // => ['Photo']
```

#### Inherited from

`GraphQLSchema.getImplementations`

***

### getMutationType()

> **getMutationType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

Defined in: node\_modules/graphql/type/schema.d.mts:293

Returns the root object type for mutation operations.

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

The mutation root type, if this schema defines one.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type Query {
    greeting: String
  }

  type Mutation {
    setGreeting(value: String!): String
  }
`);

schema.getMutationType()?.name; // => 'Mutation'
```

#### Inherited from

`GraphQLSchema.getMutationType`

***

### getPossibleTypes()

> **getPossibleTypes**(`abstractType`): readonly `GraphQLObjectType`\<`any`, `any`, `any`\>[]

Defined in: node\_modules/graphql/type/schema.d.mts:425

Returns object types that may be returned for an abstract type.

#### Parameters

##### abstractType

`GraphQLAbstractType`

Interface or union type to inspect.

#### Returns

readonly `GraphQLObjectType`\<`any`, `any`, `any`\>[]

Object types that may satisfy the abstract type.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';
import { assertInterfaceType, assertUnionType } from 'graphql/type';

const schema = buildSchema(`
  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
  }

  type Organization implements Node {
    id: ID!
  }

  union SearchResult = User | Organization

  type Query {
    node: Node
    search: [SearchResult]
  }
`);

const Node = assertInterfaceType(schema.getType('Node'));
const SearchResult = assertUnionType(schema.getType('SearchResult'));

schema.getPossibleTypes(Node).map((type) => type.name); // => ['User', 'Organization']
schema.getPossibleTypes(SearchResult).map((type) => type.name); // => ['User', 'Organization']
```

#### Inherited from

`GraphQLSchema.getPossibleTypes`

***

### getQueryType()

> **getQueryType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

Defined in: node\_modules/graphql/type/schema.d.mts:272

Returns the root object type for query operations.

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

The query root type, if this schema defines one.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type Query {
    greeting: String
  }
`);

schema.getQueryType()?.name; // => 'Query'
```

#### Inherited from

`GraphQLSchema.getQueryType`

***

### getRootType()

> **getRootType**(`operation`): `Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

Defined in: node\_modules/graphql/type/schema.d.mts:339

Returns the root object type for the requested operation kind.

#### Parameters

##### operation

`OperationTypeNode`

Operation kind to resolve.

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

The root object type for the operation kind, if this schema defines one.

#### Example

```ts
import { OperationTypeNode } from 'graphql/language';
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type Query {
    greeting: String
  }

  type Mutation {
    setGreeting(value: String!): String
  }
`);

schema.getRootType(OperationTypeNode.QUERY)?.name; // => 'Query'
schema.getRootType(OperationTypeNode.MUTATION)?.name; // => 'Mutation'
schema.getRootType(OperationTypeNode.SUBSCRIPTION); // => undefined
```

#### Inherited from

`GraphQLSchema.getRootType`

***

### getSubscriptionType()

> **getSubscriptionType**(): `Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

Defined in: node\_modules/graphql/type/schema.d.mts:314

Returns the root object type for subscription operations.

#### Returns

`Maybe`\<`GraphQLObjectType`\<`any`, `any`, `any`\>\>

The subscription root type, if this schema defines one.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type Query {
    greeting: String
  }

  type Subscription {
    greetings: String
  }
`);

schema.getSubscriptionType()?.name; // => 'Subscription'
```

#### Inherited from

`GraphQLSchema.getSubscriptionType`

***

### getType()

> **getType**(`name`): `GraphQLNamedType` \| `undefined`

Defined in: node\_modules/graphql/type/schema.d.mts:387

Returns the named type with the provided name.

#### Parameters

##### name

`string`

The GraphQL name to look up.

#### Returns

`GraphQLNamedType` \| `undefined`

The named schema type, if one exists.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type User {
    name: String
  }

  type Query {
    viewer: User
  }
`);

schema.getType('User')?.toString(); // => 'User'
schema.getType('Missing'); // => undefined
```

#### Inherited from

`GraphQLSchema.getType`

***

### getTypeMap()

> **getTypeMap**(): `TypeMap`

Defined in: node\_modules/graphql/type/schema.d.mts:364

Returns all named types known to this schema.

#### Returns

`TypeMap`

A map of schema types keyed by type name.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';

const schema = buildSchema(`
  type User {
    name: String
  }

  type Query {
    viewer: User
  }
`);

const typeMap = schema.getTypeMap();

typeMap.User.name; // => 'User'
typeMap.Query.name; // => 'Query'
typeMap.String.name; // => 'String'
```

#### Inherited from

`GraphQLSchema.getTypeMap`

***

### isSubType()

> **isSubType**(`abstractType`, `maybeSubType`): `boolean`

Defined in: node\_modules/graphql/type/schema.d.mts:503

Returns whether one type is a possible runtime subtype of an abstract type.

#### Parameters

##### abstractType

`GraphQLAbstractType`

Interface or union type to inspect.

##### maybeSubType

`GraphQLObjectType`\<`any`, `any`, `any`\> \| `GraphQLInterfaceType`\<`any`, `any`\>

Object or interface type to test as a possible subtype.

#### Returns

`boolean`

True when the subtype may satisfy the abstract type.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';
import { assertInterfaceType, assertObjectType } from 'graphql/type';

const schema = buildSchema(`
  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
  }

  type Review {
    body: String
  }

  type Query {
    node: Node
    review: Review
  }
`);

const Node = assertInterfaceType(schema.getType('Node'));
const User = assertObjectType(schema.getType('User'));
const Review = assertObjectType(schema.getType('Review'));

schema.isSubType(Node, User); // => true
schema.isSubType(Node, Review); // => false
```

#### Inherited from

`GraphQLSchema.isSubType`

***

### toConfig()

> **toConfig**(): `GraphQLSchemaNormalizedConfig`

Defined in: node\_modules/graphql/type/schema.d.mts:598

Returns a normalized configuration object for this object.

The returned config preserves the original `assumeValid` flag so the schema
can be recreated with the same validation behavior.

#### Returns

`GraphQLSchemaNormalizedConfig`

A configuration object that can be used to recreate this object.

#### Example

```ts
import { buildSchema } from 'graphql/utilities';
import { GraphQLSchema } from 'graphql/type';

const schema = buildSchema(`
  type Query {
    greeting: String
  }
`);

const config = schema.toConfig();
const schemaCopy = new GraphQLSchema(config);

config.query?.name; // => 'Query'
schemaCopy.getQueryType()?.name; // => 'Query'
```

#### Inherited from

`GraphQLSchema.toConfig`
