import { buildSchema, GraphQLNamedType } from 'graphql';
import { pruneSchema } from '../src/prune';
import { PruneSchemaFilter } from '../src';

describe('pruneSchema', () => {
  test('can handle recursive input types', () => {
    const schema = buildSchema(`
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
    const schema = buildSchema(`
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
    const schema = buildSchema(`
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
    const schema = buildSchema(`
      type Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
      `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused input objects', () => {
    const schema = buildSchema(`
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
    const schema = buildSchema(`
      input Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
      `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused unions', () => {
    const schema = buildSchema(`
      union Unused

      type Query {
        foo: Boolean
      }
      `);
    const result = pruneSchema(schema);
    expect(result.getType('Unused')).toBeUndefined();
  });

  test('does not remove unused unions when skipEmptyUnionPruning is true', () => {
    const schema = buildSchema(`
      union Unused

      type Query {
        foo: Boolean
      }
      `);
    const result = pruneSchema(schema, {
      skipEmptyUnionPruning: true,
      skipUnusedTypesPruning: true
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes unused interfaces', () => {
    const schema = buildSchema(`
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
    const schema = buildSchema(`
      interface Unused {
        value: String
      }

      type Query {
        foo: Boolean
      }
      `);
    const result = pruneSchema(schema, {
      skipUnimplementedInterfacesPruning: true,
      skipUnusedTypesPruning: true
    });
    expect(result.getType('Unused')).toBeDefined();
  });

  test('removes top level objects with no fields', () => {
    const schema = buildSchema(`
      type Query {
        foo: Boolean
      }
      
      type Mutation
      `);
    const result = pruneSchema(schema);
    expect(result.getMutationType()).toBeUndefined();
  });

  test('does not removes objects with no fields when skipEmptyCompositeTypePruning is true', () => {
    const schema = buildSchema(`
      type Query {
        foo: Boolean
      }
      
      type Foo
    `);
    const result = pruneSchema(schema, {
      skipUnusedTypesPruning: true,
      skipEmptyCompositeTypePruning: true
    });
    expect(result.getType('Foo')).toBeDefined();
  });

  test('removes unused interfaces when implementations are unused', () => {
    const schema = buildSchema(`
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
    const schema = buildSchema(`
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
    const schema = buildSchema(`
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
    const schema = buildSchema(`
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
      skipPruning: doNotPruneTypeWithBar
    });

    expect(result.getType('CustomType')).toBeDefined();
  });
});
