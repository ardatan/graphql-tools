import { buildSchema } from 'graphql';
import { pruneSchema } from '../src/prune';

describe('prune', () => {
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
});
