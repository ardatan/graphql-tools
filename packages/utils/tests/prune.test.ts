import { buildSchema, GraphQLNamedType } from 'graphql';
import { pruneSchema } from '../src/prune.js';
import { PruneSchemaFilter } from '../src/index.js';

describe('pruneSchema', () => {
  test('can handle recursive input types', () => {
    const schema = buildSchema(/* GraphQL */ `
      input Input {
        moreInput: Input
      }

      type Query {
        someQuery(input: Input): Boolean
      }
    `);
    pruneSchema(schema);
  });

  test('removes unused enums', () => {
    const schema = buildSchema(/* GraphQL */ `
      enum Unused {
        VALUE
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('removes unused objects', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('does not remove unused objects when skipUnusedTypesPruning is true', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true,
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused custom scalar', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar CustomScalar

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('CustomScalar')).toBeUndefined();
  });

  test('does not remove unused custom scalar when skipUnusedTypesPruning set to true', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar CustomScalar

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true,
    });
    expect(result.getType('CustomScalar')).toBeDefined();
  });

  test('does not remove used input objects', () => {
    const schema = buildSchema(/* GraphQL */ `
      input UsedInput {
        value: String
      }

      type Query {
        foo(input: UsedInput): Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('UsedInput')).toBeDefined();
  });

  test('removes unused input objects', () => {
    const schema = buildSchema(/* GraphQL */ `
      input Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('does not remove unused input objects when skipUnusedTypesPruning is true', () => {
    const schema = buildSchema(/* GraphQL */ `
      input Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true,
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused unions', () => {
    const schema = buildSchema(/* GraphQL */ `
      union Unused

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('does not remove unused unions when skipEmptyUnionPruning is true', () => {
    const schema = buildSchema(/* GraphQL */ `
      union Unused

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema, {
      skipEmptyUnionPruning: true,
      skipUnusedTypesPruning: true,
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused interfaces', () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('does not remove unused interfaces when skipUnimplementedInterfacesPruning is true', () => {
    const schema = buildSchema(/* GraphQL */ `
      interface Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema, {
      skipUnimplementedInterfacesPruning: true,
      skipUnusedTypesPruning: true,
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused implementations of interfaces', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        operation: SomeType
      }

      interface SomeInterface {
        field: String
      }

      type SomeType implements SomeInterface {
        field: String
      }

      type ShouldPrune implements SomeInterface {
        field: String
      }
    `);

    const result = pruneSchema(schema);

    expect(result.getType('ShouldPrune')).toBeUndefined();
  });

  test('does not remove implementations of interfaces used as return', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        operation: SomeType
      }

      type SomeType {
        # SomeInterface is inline and should have all its implementations kept
        field: SomeInterface
      }

      interface SomeInterface {
        field: String
      }

      type KeepMe implements SomeInterface {
        field: String
      }
    `);

    const result = pruneSchema(schema);

    expect(result.getType('KeepMe')).toBeDefined();
  });

  test('does not remove interfaces despite first pass', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        operation: SomeType
      }

      type SomeType {
        # This will be processed last
        afield: AsReturnType
        # This will be processed first
        bField: AsInterfaceType
      }

      # SomeInterface is declared as an interface so it should be not a return type but still visited
      type AsInterfaceType implements SomeInterface {
        field: String
      }

      # SomeInterface is a return type and should have all its implementations kept
      type AsReturnType {
        field: SomeInterface
      }

      interface SomeInterface {
        field: String
      }

      type KeepMe implements SomeInterface {
        field: String
      }
    `);

    const result = pruneSchema(schema);

    expect(result.getType('KeepMe')).toBeDefined();
  });

  test('removes top level objects with no fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: Boolean
      }

      type Mutation
    `);
    const result = pruneSchema(schema);
    expect(result.getMutationType()).toBeUndefined();
  });

  test('does not removes objects with no fields when skipEmptyCompositeTypePruning is true', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: Boolean
      }

      type Foo
    `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true,
      skipEmptyCompositeTypePruning: true,
    });
    expect(result.getType('Foo')).toBeDefined();
  });

  test('removes unused interfaces when implementations are unused', () => {
    const schema = buildSchema(/* GraphQL */ `
      interface UnusedInterface {
        value: String
      }

      type UnusedType implements UnusedInterface {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('UnusedType')).toBeUndefined();
    expect(result.getType('UnusedInterface')).toBeUndefined();
  });

  test('removes unused unions when implementations are unused', () => {
    const schema = buildSchema(/* GraphQL */ `
      union UnusedUnion = UnusedType

      type UnusedType {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('UnusedType')).toBeUndefined();
    expect(result.getType('UnusedUnion')).toBeUndefined();
  });

  test('does not throw on pruning unimplemented interfaces', () => {
    const schema = buildSchema(/* GraphQL */ `
      interface UnimplementedInterface {
        value: String
      }

      type Query {
        foo: UnimplementedInterface
      }
    `);
    const result = pruneSchema(schema);
    expect(result.getType('UnimplementedInterface')).toBeDefined();
  });

  test('does not prune types that match the filter', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar on OBJECT

      type CustomType @bar {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);

    // Do not prune any type that has the @bar directive
    const doNotPruneTypeWithBar: PruneSchemaFilter = (type: GraphQLNamedType) => {
      return !!type.astNode?.directives?.find(it => it.name.value === 'bar');
    };

    const result = pruneSchema(schema, {
      skipPruning: doNotPruneTypeWithBar,
    });

    expect(result.getType('CustomType')).toBeDefined();
  });

  test('does not prune types or its leaves that match the filter', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar on OBJECT

      type SomeInterface {
        value: String
      }

      type CustomType implements SomeInterface @bar {
        value: String
      }

      type Query {
        foo: Boolean
      }
    `);

    // Do not prune any type that has the @bar directive
    const doNotPruneTypeWithBar: PruneSchemaFilter = (type: GraphQLNamedType) => {
      return !!type.astNode?.directives?.find(it => it.name.value === 'bar');
    };

    const result = pruneSchema(schema, {
      skipPruning: doNotPruneTypeWithBar,
    });

    expect(result.getType('CustomType')).toBeDefined();
    expect(result.getType('SomeInterface')).toBeDefined();
  });

  test('does not remove type used in object type directive argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar(arg: DirectiveArg) on OBJECT

      enum DirectiveArg {
        VALUE1
        VALUE2
      }

      type CustomType @bar(arg: VALUE1) {
        value: String
      }

      type Query {
        foo: CustomType
      }
    `);

    const result = pruneSchema(schema);
    expect(result.getType('DirectiveArg')).toBeDefined();
  });

  test('does not remove type used in field definition directive argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar(arg: DirectiveArg) on FIELD_DEFINITION

      enum DirectiveArg {
        VALUE1
        VALUE2
      }

      type CustomType {
        value: String @bar(arg: VALUE1)
      }

      type Query {
        foo: CustomType
      }
    `);

    const result = pruneSchema(schema);
    expect(result.getType('DirectiveArg')).toBeDefined();
  });

  test('does not remove type used in enum value directive argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar(arg: DirectiveArg) on ENUM_VALUE

      enum DirectiveArg {
        VALUE1
        VALUE2
      }

      enum MyEnum {
        VALUE3 @bar(arg: VALUE1)
        VALUE4
      }

      type Query {
        foo: MyEnum
      }
    `);

    const result = pruneSchema(schema);
    expect(result.getType('DirectiveArg')).toBeDefined();
  });

  test('does not remove type used in argument definition directive argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @bar(arg: DirectiveArg) on ARGUMENT_DEFINITION

      enum DirectiveArg {
        VALUE1
        VALUE2
      }

      type Query {
        foo(arg: String @bar(arg: VALUE1)): Boolean
      }
    `);

    const result = pruneSchema(schema);
    expect(result.getType('DirectiveArg')).toBeDefined();
  });
});
