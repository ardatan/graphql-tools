import { identityFunc } from '../../jsutils/identityFunc.js';
import { inspect } from '../../jsutils/inspect.js';

import { parseValue } from '../../language/parser.js';

import type { GraphQLNullableType, GraphQLType } from '../definition.js';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
} from '../definition.js';

const ScalarType = new GraphQLScalarType({ name: 'Scalar' });
const ObjectType = new GraphQLObjectType({ name: 'Object', fields: {} });
const InterfaceType = new GraphQLInterfaceType({
  name: 'Interface',
  fields: {},
});
const UnionType = new GraphQLUnionType({ name: 'Union', types: [ObjectType] });
const EnumType = new GraphQLEnumType({ name: 'Enum', values: { foo: {} } });
const InputObjectType = new GraphQLInputObjectType({
  name: 'InputObject',
  fields: {},
});

const ListOfScalarsType = new GraphQLList(ScalarType);
const NonNullScalarType = new GraphQLNonNull(ScalarType);
const ListOfNonNullScalarsType = new GraphQLList(NonNullScalarType);
const NonNullListOfScalars = new GraphQLNonNull(ListOfScalarsType);

/* c8 ignore next */
// @ts-expect-error
const dummyFunc = () => expect.fail('Never called and used as a placeholder');

describe('Type System: Scalars', () => {
  it('accepts a Scalar type defining serialize', () => {
    expect(() => new GraphQLScalarType({ name: 'SomeScalar' })).not.toThrow();
  });

  it('accepts a Scalar type defining specifiedByURL', () => {
    expect(
      () =>
        new GraphQLScalarType({
          name: 'SomeScalar',
          specifiedByURL: 'https://example.com/foo_spec',
        })
    ).not.toThrow();
  });

  it('accepts a Scalar type defining parseValue and parseLiteral', () => {
    expect(
      () =>
        new GraphQLScalarType({
          name: 'SomeScalar',
          parseValue: dummyFunc,
          parseLiteral: dummyFunc,
        })
    ).not.toThrow();
  });

  it('provides default methods if omitted', () => {
    const scalar = new GraphQLScalarType({ name: 'Foo' });

    expect(scalar.serialize).toEqual(identityFunc);
    expect(scalar.parseValue).toEqual(identityFunc);
    expect(typeof scalar.parseLiteral === 'function').toBeTruthy();
  });

  it('use parseValue for parsing literals if parseLiteral omitted', () => {
    const scalar = new GraphQLScalarType({
      name: 'Foo',
      parseValue(value) {
        return 'parseValue: ' + inspect(value);
      },
    });

    expect(scalar.parseLiteral(parseValue('null'))).toEqual('parseValue: null');
    expect(scalar.parseLiteral(parseValue('{ foo: "bar" }'))).toEqual('parseValue: { foo: "bar" }');
    expect(scalar.parseLiteral(parseValue('{ foo: { bar: $var } }'), { var: 'baz' })).toEqual(
      'parseValue: { foo: { bar: "baz" } }'
    );
  });

  it('rejects a Scalar type defining parseLiteral but not parseValue', () => {
    expect(
      () =>
        new GraphQLScalarType({
          name: 'SomeScalar',
          parseLiteral: dummyFunc,
        })
    ).toThrow('SomeScalar must provide both "parseValue" and "parseLiteral" functions.');
  });
});

describe('Type System: Objects', () => {
  it('does not mutate passed field definitions', () => {
    const outputFields = {
      field1: { type: ScalarType },
      field2: {
        type: ScalarType,
        args: {
          id: { type: ScalarType },
        },
      },
    };
    const testObject1 = new GraphQLObjectType({
      name: 'Test1',
      fields: outputFields,
    });
    const testObject2 = new GraphQLObjectType({
      name: 'Test2',
      fields: outputFields,
    });

    expect(testObject1.getFields()).toEqual(testObject2.getFields());
    expect(outputFields).toEqual({
      field1: {
        type: ScalarType,
      },
      field2: {
        type: ScalarType,
        args: {
          id: { type: ScalarType },
        },
      },
    });

    const inputFields = {
      field1: { type: ScalarType },
      field2: { type: ScalarType },
    };
    const testInputObject1 = new GraphQLInputObjectType({
      name: 'Test1',
      fields: inputFields,
    });
    const testInputObject2 = new GraphQLInputObjectType({
      name: 'Test2',
      fields: inputFields,
    });

    expect(testInputObject1.getFields()).toEqual(testInputObject2.getFields());
    expect(inputFields).toEqual({
      field1: { type: ScalarType },
      field2: { type: ScalarType },
    });
  });

  it('defines an object type with deprecated field', () => {
    const TypeWithDeprecatedField = new GraphQLObjectType({
      name: 'foo',
      fields: {
        bar: {
          type: ScalarType,
          deprecationReason: 'A terrible reason',
        },
        baz: {
          type: ScalarType,
          deprecationReason: '',
        },
      },
    });

    expect(TypeWithDeprecatedField.getFields().bar).toMatchObject({
      name: 'bar',
      deprecationReason: 'A terrible reason',
    });

    expect(TypeWithDeprecatedField.getFields().baz).toMatchObject({
      name: 'baz',
      deprecationReason: '',
    });
  });

  it('accepts an Object type with a field function', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: () => ({
        f: { type: ScalarType },
      }),
    });
    expect(objType.getFields()).toEqual({
      f: {
        name: 'f',
        description: undefined,
        type: ScalarType,
        args: [],
        resolve: undefined,
        subscribe: undefined,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    });
  });

  it('accepts an Object type with field args', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        f: {
          type: ScalarType,
          args: {
            arg: { type: ScalarType },
          },
        },
      },
    });
    expect(objType.getFields()).toEqual({
      f: {
        name: 'f',
        description: undefined,
        type: ScalarType,
        args: [
          {
            name: 'arg',
            description: undefined,
            type: ScalarType,
            defaultValue: undefined,
            deprecationReason: undefined,
            extensions: {},
            astNode: undefined,
          },
        ],
        resolve: undefined,
        subscribe: undefined,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    });
  });

  it('accepts an Object type with array interfaces', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {},
      interfaces: [InterfaceType],
    });
    expect(objType.getInterfaces()).toEqual([InterfaceType]);
  });

  it('accepts an Object type with interfaces as a function returning an array', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {},
      interfaces: () => [InterfaceType],
    });
    expect(objType.getInterfaces()).toEqual([InterfaceType]);
  });

  it('accepts a lambda as an Object field resolver', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        f: {
          type: ScalarType,
          resolve: dummyFunc,
        },
      },
    });
    expect(() => objType.getFields()).not.toThrow();
  });

  it('rejects an Object type with invalid name', () => {
    expect(() => new GraphQLObjectType({ name: 'bad-name', fields: {} })).toThrow(
      'Names must only contain [_a-zA-Z0-9] but "bad-name" does not.'
    );
  });

  it('rejects an Object type with incorrectly named fields', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        'bad-name': { type: ScalarType },
      },
    });
    expect(() => objType.getFields()).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
  });

  it('rejects an Object type with a field function that returns incorrect type', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      // @ts-expect-error (Wrong type of return)
      fields() {
        return [{ field: ScalarType }];
      },
    });
    expect(() => objType.getFields()).toThrow();
  });

  it('rejects an Object type with incorrectly named field args', () => {
    const objType = new GraphQLObjectType({
      name: 'SomeObject',
      fields: {
        badField: {
          type: ScalarType,
          args: {
            'bad-name': { type: ScalarType },
          },
        },
      },
    });
    expect(() => objType.getFields()).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
  });
});

describe('Type System: Interfaces', () => {
  it('accepts an Interface type defining resolveType', () => {
    expect(
      () =>
        new GraphQLInterfaceType({
          name: 'AnotherInterface',
          fields: { f: { type: ScalarType } },
        })
    ).not.toThrow();
  });

  it('accepts an Interface type with an array of interfaces', () => {
    const implementing = new GraphQLInterfaceType({
      name: 'AnotherInterface',
      fields: {},
      interfaces: [InterfaceType],
    });
    expect(implementing.getInterfaces()).toEqual([InterfaceType]);
  });

  it('accepts an Interface type with interfaces as a function returning an array', () => {
    const implementing = new GraphQLInterfaceType({
      name: 'AnotherInterface',
      fields: {},
      interfaces: () => [InterfaceType],
    });
    expect(implementing.getInterfaces()).toEqual([InterfaceType]);
  });

  it('rejects an Interface type with invalid name', () => {
    expect(() => new GraphQLInterfaceType({ name: 'bad-name', fields: {} })).toThrow(
      'Names must only contain [_a-zA-Z0-9] but "bad-name" does not.'
    );
  });
});

describe('Type System: Unions', () => {
  it('accepts a Union type defining resolveType', () => {
    expect(
      () =>
        new GraphQLUnionType({
          name: 'SomeUnion',
          types: [ObjectType],
        })
    ).not.toThrow();
  });

  it('accepts a Union type with array types', () => {
    const unionType = new GraphQLUnionType({
      name: 'SomeUnion',
      types: [ObjectType],
    });
    expect(unionType.getTypes()).toEqual([ObjectType]);
  });

  it('accepts a Union type with function returning an array of types', () => {
    const unionType = new GraphQLUnionType({
      name: 'SomeUnion',
      types: () => [ObjectType],
    });
    expect(unionType.getTypes()).toEqual([ObjectType]);
  });

  it('accepts a Union type without types', () => {
    const unionType = new GraphQLUnionType({
      name: 'SomeUnion',
      types: [],
    });
    expect(unionType.getTypes()).toEqual([]);
  });

  it('rejects an Union type with invalid name', () => {
    expect(() => new GraphQLUnionType({ name: 'bad-name', types: [] })).toThrow(
      'Names must only contain [_a-zA-Z0-9] but "bad-name" does not.'
    );
  });
});

describe('Type System: Enums', () => {
  it('defines an enum type with deprecated value', () => {
    const EnumTypeWithDeprecatedValue = new GraphQLEnumType({
      name: 'EnumWithDeprecatedValue',
      values: {
        foo: { deprecationReason: 'Just because' },
        bar: { deprecationReason: '' },
      },
    });

    expect(EnumTypeWithDeprecatedValue.getValues()[0]).toMatchObject({
      name: 'foo',
      deprecationReason: 'Just because',
    });

    expect(EnumTypeWithDeprecatedValue.getValues()[1]).toMatchObject({
      name: 'bar',
      deprecationReason: '',
    });
  });

  it('defines an enum type with a value of `null` and `undefined`', () => {
    const EnumTypeWithNullishValue = new GraphQLEnumType({
      name: 'EnumWithNullishValue',
      values: {
        NULL: { value: null },
        NAN: { value: NaN },
        NO_CUSTOM_VALUE: { value: undefined },
      },
    });

    expect(EnumTypeWithNullishValue.getValues()).toEqual([
      {
        name: 'NULL',
        description: undefined,
        value: null,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
      {
        name: 'NAN',
        description: undefined,
        value: NaN,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
      {
        name: 'NO_CUSTOM_VALUE',
        description: undefined,
        value: 'NO_CUSTOM_VALUE',
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    ]);
  });

  it('accepts a well defined Enum type with empty value definition', () => {
    const enumType = new GraphQLEnumType({
      name: 'SomeEnum',
      values: {
        FOO: {},
        BAR: {},
      },
    });
    expect(enumType.getValue('FOO')).toHaveProperty('value', 'FOO');
    expect(enumType.getValue('BAR')).toHaveProperty('value', 'BAR');
  });

  it('accepts a well defined Enum type with internal value definition', () => {
    const enumType = new GraphQLEnumType({
      name: 'SomeEnum',
      values: {
        FOO: { value: 10 },
        BAR: { value: 20 },
      },
    });
    expect(enumType.getValue('FOO')).toHaveProperty('value', 10);
    expect(enumType.getValue('BAR')).toHaveProperty('value', 20);
  });

  it('rejects an Enum type with invalid name', () => {
    expect(() => new GraphQLEnumType({ name: 'bad-name', values: {} })).toThrow(
      'Names must only contain [_a-zA-Z0-9] but "bad-name" does not.'
    );
  });

  it('rejects an Enum type with incorrectly named values', () => {
    expect(
      () =>
        new GraphQLEnumType({
          name: 'SomeEnum',
          values: {
            'bad-name': {},
          },
        })
    ).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
  });
});

describe('Type System: Input Objects', () => {
  describe('Input Objects must have fields', () => {
    it('accepts an Input Object type with fields', () => {
      const inputObjType = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          f: { type: ScalarType },
        },
      });
      expect(inputObjType.getFields()).toEqual({
        f: {
          name: 'f',
          description: undefined,
          type: ScalarType,
          defaultValue: undefined,
          deprecationReason: undefined,
          extensions: {},
          astNode: undefined,
        },
      });
    });

    it('accepts an Input Object type with a field function', () => {
      const inputObjType = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: () => ({
          f: { type: ScalarType },
        }),
      });
      expect(inputObjType.getFields()).toEqual({
        f: {
          name: 'f',
          description: undefined,
          type: ScalarType,
          defaultValue: undefined,
          extensions: {},
          deprecationReason: undefined,
          astNode: undefined,
        },
      });
    });

    it('rejects an Input Object type with invalid name', () => {
      expect(() => new GraphQLInputObjectType({ name: 'bad-name', fields: {} })).toThrow(
        'Names must only contain [_a-zA-Z0-9] but "bad-name" does not.'
      );
    });

    it('rejects an Input Object type with incorrectly named fields', () => {
      const inputObjType = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          'bad-name': { type: ScalarType },
        },
      });
      expect(() => inputObjType.getFields()).toThrow('Names must only contain [_a-zA-Z0-9] but "bad-name" does not.');
    });
  });

  describe('Input Object fields must not have resolvers', () => {
    it('rejects an Input Object type with resolvers', () => {
      const inputObjType = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          // @ts-expect-error (Input fields cannot have resolvers)
          f: { type: ScalarType, resolve: dummyFunc },
        },
      });
      expect(() => inputObjType.getFields()).toThrow(
        'SomeInputObject.f field has a resolve property, but Input Types cannot define resolvers.'
      );
    });

    it('rejects an Input Object type with resolver constant', () => {
      const inputObjType = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          // @ts-expect-error (Input fields cannot have resolvers)
          f: { type: ScalarType, resolve: {} },
        },
      });
      expect(() => inputObjType.getFields()).toThrow(
        'SomeInputObject.f field has a resolve property, but Input Types cannot define resolvers.'
      );
    });
  });

  it('Deprecation reason is preserved on fields', () => {
    const inputObjType = new GraphQLInputObjectType({
      name: 'SomeInputObject',
      fields: {
        deprecatedField: {
          type: ScalarType,
          deprecationReason: 'not used anymore',
        },
      },
    });
    expect(inputObjType.toConfig()).toHaveProperty('fields.deprecatedField.deprecationReason', 'not used anymore');
  });
});

describe('Type System: List', () => {
  function expectList(type: GraphQLType) {
    return expect(() => new GraphQLList(type));
  }

  it('accepts an type as item type of list', () => {
    expectList(ScalarType).not.toThrow();
    expectList(ObjectType).not.toThrow();
    expectList(UnionType).not.toThrow();
    expectList(InterfaceType).not.toThrow();
    expectList(EnumType).not.toThrow();
    expectList(InputObjectType).not.toThrow();
    expectList(ListOfScalarsType).not.toThrow();
    expectList(NonNullScalarType).not.toThrow();
  });
});

describe('Type System: Non-Null', () => {
  function expectNonNull(type: GraphQLNullableType) {
    return expect(() => new GraphQLNonNull(type));
  }

  it('accepts an type as nullable type of non-null', () => {
    expectNonNull(ScalarType).not.toThrow();
    expectNonNull(ObjectType).not.toThrow();
    expectNonNull(UnionType).not.toThrow();
    expectNonNull(InterfaceType).not.toThrow();
    expectNonNull(EnumType).not.toThrow();
    expectNonNull(InputObjectType).not.toThrow();
    expectNonNull(ListOfScalarsType).not.toThrow();
    expectNonNull(ListOfNonNullScalarsType).not.toThrow();
  });
});

describe('Type System: test utility methods', () => {
  it('stringifies types', () => {
    expect(String(ScalarType)).toEqual('Scalar');
    expect(String(ObjectType)).toEqual('Object');
    expect(String(InterfaceType)).toEqual('Interface');
    expect(String(UnionType)).toEqual('Union');
    expect(String(EnumType)).toEqual('Enum');
    expect(String(InputObjectType)).toEqual('InputObject');

    expect(String(NonNullScalarType)).toEqual('Scalar!');
    expect(String(ListOfScalarsType)).toEqual('[Scalar]');
    expect(String(NonNullListOfScalars)).toEqual('[Scalar]!');
    expect(String(ListOfNonNullScalarsType)).toEqual('[Scalar!]');
    expect(String(new GraphQLList(ListOfScalarsType))).toEqual('[[Scalar]]');
  });

  it('JSON.stringifies types', () => {
    expect(JSON.stringify(ScalarType)).toEqual('"Scalar"');
    expect(JSON.stringify(ObjectType)).toEqual('"Object"');
    expect(JSON.stringify(InterfaceType)).toEqual('"Interface"');
    expect(JSON.stringify(UnionType)).toEqual('"Union"');
    expect(JSON.stringify(EnumType)).toEqual('"Enum"');
    expect(JSON.stringify(InputObjectType)).toEqual('"InputObject"');

    expect(JSON.stringify(NonNullScalarType)).toEqual('"Scalar!"');
    expect(JSON.stringify(ListOfScalarsType)).toEqual('"[Scalar]"');
    expect(JSON.stringify(NonNullListOfScalars)).toEqual('"[Scalar]!"');
    expect(JSON.stringify(ListOfNonNullScalarsType)).toEqual('"[Scalar!]"');
    expect(JSON.stringify(new GraphQLList(ListOfScalarsType))).toEqual('"[[Scalar]]"');
  });

  it('Object.toStringifies types', () => {
    function toString(obj: unknown): string {
      return Object.prototype.toString.call(obj);
    }

    expect(toString(ScalarType)).toEqual('[object GraphQLScalarType]');
    expect(toString(ObjectType)).toEqual('[object GraphQLObjectType]');
    expect(toString(InterfaceType)).toEqual('[object GraphQLInterfaceType]');
    expect(toString(UnionType)).toEqual('[object GraphQLUnionType]');
    expect(toString(EnumType)).toEqual('[object GraphQLEnumType]');
    expect(toString(InputObjectType)).toEqual('[object GraphQLInputObjectType]');
    expect(toString(NonNullScalarType)).toEqual('[object GraphQLNonNull]');
    expect(toString(ListOfScalarsType)).toEqual('[object GraphQLList]');
  });
});
