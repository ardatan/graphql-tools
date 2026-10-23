import {
  buildSchema,
  getNamedType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLString,
  isObjectType,
} from 'graphql';
import { MapperKind, mapSchema } from '../src/index.js';
import { rewireTypes } from '../src/rewire.js';
import { createNamedStub } from '../src/stub.js';

function userTypeMap(schema: ReturnType<typeof buildSchema>) {
  const typeMap: Record<string, GraphQLNamedType> = Object.create(null);
  for (const [name, type] of Object.entries(schema.getTypeMap())) {
    if (!name.startsWith('__')) {
      typeMap[name] = type;
    }
  }
  return typeMap;
}

describe('rewireTypes', () => {
  test('recreates only types that reference a replaced type', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: Foo
        bar: Bar
      }

      type Foo {
        id: ID
      }

      type Bar {
        name: String
      }
    `);

    const typeMap = userTypeMap(schema);
    const originalBar = typeMap['Bar'] as GraphQLObjectType;
    const originalFoo = typeMap['Foo'] as GraphQLObjectType;
    const originalQuery = typeMap['Query'] as GraphQLObjectType;

    typeMap['Foo'] = new GraphQLObjectType({
      ...originalFoo.toConfig(),
      description: 'replaced',
    });

    const { typeMap: rewired } = rewireTypes(typeMap, schema.getDirectives());

    expect(rewired['Bar']).toBe(originalBar);
    expect(rewired['Foo']).toBe(typeMap['Foo']);
    expect(rewired['Query']).not.toBe(originalQuery);
    expect(isObjectType(rewired['Query']) && rewired['Query'].getFields()['foo'].type).toBe(
      rewired['Foo'],
    );
    expect(isObjectType(rewired['Query']) && rewired['Query'].getFields()['bar'].type).toBe(
      originalBar,
    );
  });

  test('rewires types whose fields still point at named stubs', () => {
    const query = new GraphQLObjectType({
      name: 'Query',
      fields: {
        foo: {
          type: createNamedStub('String', 'object'),
        },
      },
    });

    const { typeMap } = rewireTypes({ Query: query }, []);

    expect(typeMap['Query']).not.toBe(query);
    expect(isObjectType(typeMap['Query']) && typeMap['Query'].getFields()['foo'].type).toBe(
      GraphQLString,
    );
  });
});

describe('mapSchema', () => {
  test('keeps unused enum and scalar identity when only another type is mapped', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar Unused

      enum Color {
        RED
      }

      type Query {
        foo: Foo
      }

      type Foo {
        id: ID
      }
    `);

    const originalUnused = schema.getType('Unused');
    const originalColor = schema.getType('Color');
    const originalFoo = schema.getType('Foo');

    const mapped = mapSchema(schema, {
      [MapperKind.OBJECT_TYPE]: type => {
        if (type.name !== 'Foo') {
          return undefined;
        }
        return new GraphQLObjectType({
          ...type.toConfig(),
          description: 'mapped',
        });
      },
    });

    expect(mapped.getType('Unused')).toBe(originalUnused);
    expect(mapped.getType('Color')).toBe(originalColor);
    expect(mapped.getType('Foo')).not.toBe(originalFoo);
    expect(mapped.getType('Foo')?.description).toBe('mapped');
    expect(getNamedType(mapped.getQueryType()!.getFields()['foo'].type)).toBe(
      mapped.getType('Foo'),
    );
  });
});
