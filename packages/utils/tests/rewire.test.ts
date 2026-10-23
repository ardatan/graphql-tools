import {
  buildSchema,
  DirectiveLocation,
  getNamedType,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  isInputObjectType,
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

  test('keeps parents of a registered type whose first field is _fake', () => {
    const fake = new GraphQLObjectType({
      name: 'Fake',
      fields: {
        _fake: { type: GraphQLString },
      },
    });
    const query = new GraphQLObjectType({
      name: 'Query',
      fields: {
        fake: { type: fake },
      },
    });

    const { typeMap } = rewireTypes({ Query: query, Fake: fake }, []);

    expect(typeMap['Fake']).toBe(fake);
    expect(typeMap['Query']).toBe(query);
  });

  test('rewires fields that still point at the discarded type when names collide', () => {
    const discardedBar = new GraphQLObjectType({
      name: 'Bar',
      fields: {
        name: { type: GraphQLString },
      },
    });
    const keptBar = new GraphQLObjectType({
      name: 'Bar',
      fields: {
        name: { type: GraphQLString },
        extra: { type: GraphQLString },
      },
    });
    const query = new GraphQLObjectType({
      name: 'Query',
      fields: {
        bar: { type: discardedBar },
      },
    });

    const typeMap: Record<string, GraphQLNamedType> = Object.create(null);
    typeMap['Foo'] = keptBar;
    typeMap['Bar'] = discardedBar;
    typeMap['Query'] = query;

    const { typeMap: rewired } = rewireTypes(typeMap, []);

    expect(rewired['Bar']).toBe(keptBar);
    expect(rewired['Query']).not.toBe(query);
    expect(isObjectType(rewired['Query']) && rewired['Query'].getFields()['bar'].type).toBe(
      rewired['Bar'],
    );
    expect(
      () =>
        new GraphQLSchema({
          query: rewired['Query'] as GraphQLObjectType,
          types: Object.values(rewired),
        }),
    ).not.toThrow();
  });

  test('rewires directives whose unmapped argument types reference a replaced type', () => {
    const originalBar = new GraphQLInputObjectType({
      name: 'Bar',
      fields: {
        name: { type: GraphQLString },
      },
    });
    const replacedBar = new GraphQLInputObjectType({
      name: 'Bar',
      fields: {
        name: { type: GraphQLString },
        extra: { type: GraphQLString },
      },
    });
    const wrapper = new GraphQLInputObjectType({
      name: 'Wrapper',
      fields: {
        bar: { type: originalBar },
      },
    });
    const directive = new GraphQLDirective({
      name: 'example',
      locations: [DirectiveLocation.OBJECT],
      args: {
        input: { type: wrapper },
      },
    });

    const { typeMap: rewired, directives } = rewireTypes({ Bar: replacedBar }, [directive]);
    const rewiredDirective = directives[0];
    const rewiredWrapper = getNamedType(rewiredDirective.args[0].type);

    expect(rewiredDirective).not.toBe(directive);
    expect(isInputObjectType(rewiredWrapper) && rewiredWrapper.getFields()['bar'].type).toBe(
      rewired['Bar'],
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
