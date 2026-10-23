---
'@graphql-tools/utils': patch
---

`rewireTypes` (used by `mapSchema` and `addTypes`) now recreates only the types that actually reference a replaced type.

`mapSchema` already changes just the mapped types. `rewireTypes` then walked every type and built a new `GraphQLObjectType` / enum / scalar so field pointers stayed consistent. That is correct, and it is overkill when a pipeline maps one type on a large schema: unrelated types, unused enums, and unused scalars were cloned on every pass.

The crawl now finds types whose field, argument, interface, or union members point at a different object than the type map (including wrapper types created during mapping), then rebuilds only that set. Specified directives stay as-is. Types that do not reach a replacement keep the same JavaScript object.

`createStub` no longer builds an object/input named `String` / `ID` / `Int` / `Float` / `Boolean`. Those AST names are specified scalars, so the graphql-js singletons are returned instead. Callers such as stitch `typeFromAST` used `createStub` for every field type; the old placeholder was an illegal object type that `rewireTypes` later had to swap. `rewireTypes` still replaces leftover stubs from older callers.

```ts
const schema = buildSchema(/* GraphQL */ `
  scalar Unused
  enum Color { RED }
  type Query { foo: Foo }
  type Foo { id: ID }
`)

const mapped = mapSchema(schema, {
  [MapperKind.OBJECT_TYPE]: type =>
    type.name === 'Foo'
      ? new GraphQLObjectType({ ...type.toConfig(), description: 'mapped' })
      : undefined,
})

mapped.getType('Unused') === schema.getType('Unused')
mapped.getType('Color') === schema.getType('Color')
```
