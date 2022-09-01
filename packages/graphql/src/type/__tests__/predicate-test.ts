import { DirectiveLocation } from '../../language/directiveLocation.js';

import type { GraphQLArgument, GraphQLInputField, GraphQLInputType } from '../definition.js';
import {
  assertAbstractType,
  assertCompositeType,
  assertEnumType,
  assertInputObjectType,
  assertInputType,
  assertInterfaceType,
  assertLeafType,
  assertListType,
  assertNamedType,
  assertNonNullType,
  assertNullableType,
  assertObjectType,
  assertOutputType,
  assertScalarType,
  assertType,
  assertUnionType,
  assertWrappingType,
  getNamedType,
  getNullableType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isAbstractType,
  isCompositeType,
  isEnumType,
  isInputObjectType,
  isInputType,
  isInterfaceType,
  isLeafType,
  isListType,
  isNamedType,
  isNonNullType,
  isNullableType,
  isObjectType,
  isOutputType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  isType,
  isUnionType,
  isWrappingType,
} from '../definition.js';
import {
  assertDirective,
  GraphQLDeprecatedDirective,
  GraphQLDirective,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  isDirective,
  isSpecifiedDirective,
} from '../directives.js';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  isSpecifiedScalarType,
} from '../scalars.js';
import { assertSchema, GraphQLSchema, isSchema } from '../schema.js';

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
const ScalarType = new GraphQLScalarType({ name: 'Scalar' });
const Directive = new GraphQLDirective({
  name: 'Directive',
  locations: [DirectiveLocation.QUERY],
});

describe('Type predicates', () => {
  describe('isType', () => {
    it('returns true for unwrapped types', () => {
      expect(isType(GraphQLString)).toEqual(true);
      expect(() => assertType(GraphQLString)).not.toThrow();
      expect(isType(ObjectType)).toEqual(true);
      expect(() => assertType(ObjectType)).not.toThrow();
    });

    it('returns true for wrapped types', () => {
      expect(isType(new GraphQLNonNull(GraphQLString))).toEqual(true);
      expect(() => assertType(new GraphQLNonNull(GraphQLString))).not.toThrow();
    });

    it('returns false for type classes (rather than instances)', () => {
      expect(isType(GraphQLObjectType)).toEqual(false);
      expect(() => assertType(GraphQLObjectType)).toThrow();
    });

    it('returns false for random garbage', () => {
      expect(isType({ what: 'is this' })).toEqual(false);
      expect(() => assertType({ what: 'is this' })).toThrow();
    });
  });

  describe('isScalarType', () => {
    it('returns true for spec defined scalar', () => {
      expect(isScalarType(GraphQLString)).toEqual(true);
      expect(() => assertScalarType(GraphQLString)).not.toThrow();
    });

    it('returns true for custom scalar', () => {
      expect(isScalarType(ScalarType)).toEqual(true);
      expect(() => assertScalarType(ScalarType)).not.toThrow();
    });

    it('returns false for scalar class (rather than instance)', () => {
      expect(isScalarType(GraphQLScalarType)).toEqual(false);
      expect(() => assertScalarType(GraphQLScalarType)).toThrow();
    });

    it('returns false for wrapped scalar', () => {
      expect(isScalarType(new GraphQLList(ScalarType))).toEqual(false);
      expect(() => assertScalarType(new GraphQLList(ScalarType))).toThrow();
    });

    it('returns false for non-scalar', () => {
      expect(isScalarType(EnumType)).toEqual(false);
      expect(() => assertScalarType(EnumType)).toThrow();
      expect(isScalarType(Directive)).toEqual(false);
      expect(() => assertScalarType(Directive)).toThrow();
    });

    it('returns false for random garbage', () => {
      expect(isScalarType({ what: 'is this' })).toEqual(false);
      expect(() => assertScalarType({ what: 'is this' })).toThrow();
    });
  });

  describe('isSpecifiedScalarType', () => {
    it('returns true for specified scalars', () => {
      expect(isSpecifiedScalarType(GraphQLString)).toEqual(true);
      expect(isSpecifiedScalarType(GraphQLInt)).toEqual(true);
      expect(isSpecifiedScalarType(GraphQLFloat)).toEqual(true);
      expect(isSpecifiedScalarType(GraphQLBoolean)).toEqual(true);
      expect(isSpecifiedScalarType(GraphQLID)).toEqual(true);
    });

    it('returns false for custom scalar', () => {
      expect(isSpecifiedScalarType(ScalarType)).toEqual(false);
    });
  });

  describe('isObjectType', () => {
    it('returns true for object type', () => {
      expect(isObjectType(ObjectType)).toEqual(true);
      expect(() => assertObjectType(ObjectType)).not.toThrow();
    });

    it('returns false for wrapped object type', () => {
      expect(isObjectType(new GraphQLList(ObjectType))).toEqual(false);
      expect(() => assertObjectType(new GraphQLList(ObjectType))).toThrow();
    });

    it('returns false for non-object type', () => {
      expect(isObjectType(InterfaceType)).toEqual(false);
      expect(() => assertObjectType(InterfaceType)).toThrow();
    });
  });

  describe('isInterfaceType', () => {
    it('returns true for interface type', () => {
      expect(isInterfaceType(InterfaceType)).toEqual(true);
      expect(() => assertInterfaceType(InterfaceType)).not.toThrow();
    });

    it('returns false for wrapped interface type', () => {
      expect(isInterfaceType(new GraphQLList(InterfaceType))).toEqual(false);
      expect(() => assertInterfaceType(new GraphQLList(InterfaceType))).toThrow();
    });

    it('returns false for non-interface type', () => {
      expect(isInterfaceType(ObjectType)).toEqual(false);
      expect(() => assertInterfaceType(ObjectType)).toThrow();
    });
  });

  describe('isUnionType', () => {
    it('returns true for union type', () => {
      expect(isUnionType(UnionType)).toEqual(true);
      expect(() => assertUnionType(UnionType)).not.toThrow();
    });

    it('returns false for wrapped union type', () => {
      expect(isUnionType(new GraphQLList(UnionType))).toEqual(false);
      expect(() => assertUnionType(new GraphQLList(UnionType))).toThrow();
    });

    it('returns false for non-union type', () => {
      expect(isUnionType(ObjectType)).toEqual(false);
      expect(() => assertUnionType(ObjectType)).toThrow();
    });
  });

  describe('isEnumType', () => {
    it('returns true for enum type', () => {
      expect(isEnumType(EnumType)).toEqual(true);
      expect(() => assertEnumType(EnumType)).not.toThrow();
    });

    it('returns false for wrapped enum type', () => {
      expect(isEnumType(new GraphQLList(EnumType))).toEqual(false);
      expect(() => assertEnumType(new GraphQLList(EnumType))).toThrow();
    });

    it('returns false for non-enum type', () => {
      expect(isEnumType(ScalarType)).toEqual(false);
      expect(() => assertEnumType(ScalarType)).toThrow();
    });
  });

  describe('isInputObjectType', () => {
    it('returns true for input object type', () => {
      expect(isInputObjectType(InputObjectType)).toEqual(true);
      expect(() => assertInputObjectType(InputObjectType)).not.toThrow();
    });

    it('returns false for wrapped input object type', () => {
      expect(isInputObjectType(new GraphQLList(InputObjectType))).toEqual(false);
      expect(() => assertInputObjectType(new GraphQLList(InputObjectType))).toThrow();
    });

    it('returns false for non-input-object type', () => {
      expect(isInputObjectType(ObjectType)).toEqual(false);
      expect(() => assertInputObjectType(ObjectType)).toThrow();
    });
  });

  describe('isListType', () => {
    it('returns true for a list wrapped type', () => {
      expect(isListType(new GraphQLList(ObjectType))).toEqual(true);
      expect(() => assertListType(new GraphQLList(ObjectType))).not.toThrow();
    });

    it('returns false for an unwrapped type', () => {
      expect(isListType(ObjectType)).toEqual(false);
      expect(() => assertListType(ObjectType)).toThrow();
    });

    it('returns false for a non-list wrapped type', () => {
      expect(isListType(new GraphQLNonNull(new GraphQLList(ObjectType)))).toEqual(false);
      expect(() => assertListType(new GraphQLNonNull(new GraphQLList(ObjectType)))).toThrow();
    });
  });

  describe('isNonNullType', () => {
    it('returns true for a non-null wrapped type', () => {
      expect(isNonNullType(new GraphQLNonNull(ObjectType))).toEqual(true);
      expect(() => assertNonNullType(new GraphQLNonNull(ObjectType))).not.toThrow();
    });

    it('returns false for an unwrapped type', () => {
      expect(isNonNullType(ObjectType)).toEqual(false);
      expect(() => assertNonNullType(ObjectType)).toThrow();
    });

    it('returns false for a not non-null wrapped type', () => {
      expect(isNonNullType(new GraphQLList(new GraphQLNonNull(ObjectType)))).toEqual(false);
      expect(() => assertNonNullType(new GraphQLList(new GraphQLNonNull(ObjectType)))).toThrow();
    });
  });

  describe('isInputType', () => {
    function expectInputType(type: unknown) {
      expect(isInputType(type)).toEqual(true);
      expect(() => assertInputType(type)).not.toThrow();
    }

    it('returns true for an input type', () => {
      expectInputType(GraphQLString);
      expectInputType(EnumType);
      expectInputType(InputObjectType);
    });

    it('returns true for a wrapped input type', () => {
      expectInputType(new GraphQLList(GraphQLString));
      expectInputType(new GraphQLList(EnumType));
      expectInputType(new GraphQLList(InputObjectType));

      expectInputType(new GraphQLNonNull(GraphQLString));
      expectInputType(new GraphQLNonNull(EnumType));
      expectInputType(new GraphQLNonNull(InputObjectType));
    });

    function expectNonInputType(type: unknown) {
      expect(isInputType(type)).toEqual(false);
      expect(() => assertInputType(type)).toThrow();
    }

    it('returns false for an output type', () => {
      expectNonInputType(ObjectType);
      expectNonInputType(InterfaceType);
      expectNonInputType(UnionType);
    });

    it('returns false for a wrapped output type', () => {
      expectNonInputType(new GraphQLList(ObjectType));
      expectNonInputType(new GraphQLList(InterfaceType));
      expectNonInputType(new GraphQLList(UnionType));

      expectNonInputType(new GraphQLNonNull(ObjectType));
      expectNonInputType(new GraphQLNonNull(InterfaceType));
      expectNonInputType(new GraphQLNonNull(UnionType));
    });
  });

  describe('isOutputType', () => {
    function expectOutputType(type: unknown) {
      expect(isOutputType(type)).toEqual(true);
      expect(() => assertOutputType(type)).not.toThrow();
    }

    it('returns true for an output type', () => {
      expectOutputType(GraphQLString);
      expectOutputType(ObjectType);
      expectOutputType(InterfaceType);
      expectOutputType(UnionType);
      expectOutputType(EnumType);
    });

    it('returns true for a wrapped output type', () => {
      expectOutputType(new GraphQLList(GraphQLString));
      expectOutputType(new GraphQLList(ObjectType));
      expectOutputType(new GraphQLList(InterfaceType));
      expectOutputType(new GraphQLList(UnionType));
      expectOutputType(new GraphQLList(EnumType));

      expectOutputType(new GraphQLNonNull(GraphQLString));
      expectOutputType(new GraphQLNonNull(ObjectType));
      expectOutputType(new GraphQLNonNull(InterfaceType));
      expectOutputType(new GraphQLNonNull(UnionType));
      expectOutputType(new GraphQLNonNull(EnumType));
    });

    function expectNonOutputType(type: unknown) {
      expect(isOutputType(type)).toEqual(false);
      expect(() => assertOutputType(type)).toThrow();
    }

    it('returns false for an input type', () => {
      expectNonOutputType(InputObjectType);
    });

    it('returns false for a wrapped input type', () => {
      expectNonOutputType(new GraphQLList(InputObjectType));
      expectNonOutputType(new GraphQLNonNull(InputObjectType));
    });
  });

  describe('isLeafType', () => {
    it('returns true for scalar and enum types', () => {
      expect(isLeafType(ScalarType)).toEqual(true);
      expect(() => assertLeafType(ScalarType)).not.toThrow();
      expect(isLeafType(EnumType)).toEqual(true);
      expect(() => assertLeafType(EnumType)).not.toThrow();
    });

    it('returns false for wrapped leaf type', () => {
      expect(isLeafType(new GraphQLList(ScalarType))).toEqual(false);
      expect(() => assertLeafType(new GraphQLList(ScalarType))).toThrow();
    });

    it('returns false for non-leaf type', () => {
      expect(isLeafType(ObjectType)).toEqual(false);
      expect(() => assertLeafType(ObjectType)).toThrow();
    });

    it('returns false for wrapped non-leaf type', () => {
      expect(isLeafType(new GraphQLList(ObjectType))).toEqual(false);
      expect(() => assertLeafType(new GraphQLList(ObjectType))).toThrow();
    });
  });

  describe('isCompositeType', () => {
    it('returns true for object, interface, and union types', () => {
      expect(isCompositeType(ObjectType)).toEqual(true);
      expect(() => assertCompositeType(ObjectType)).not.toThrow();
      expect(isCompositeType(InterfaceType)).toEqual(true);
      expect(() => assertCompositeType(InterfaceType)).not.toThrow();
      expect(isCompositeType(UnionType)).toEqual(true);
      expect(() => assertCompositeType(UnionType)).not.toThrow();
    });

    it('returns false for wrapped composite type', () => {
      expect(isCompositeType(new GraphQLList(ObjectType))).toEqual(false);
      expect(() => assertCompositeType(new GraphQLList(ObjectType))).toThrow();
    });

    it('returns false for non-composite type', () => {
      expect(isCompositeType(InputObjectType)).toEqual(false);
      expect(() => assertCompositeType(InputObjectType)).toThrow();
    });

    it('returns false for wrapped non-composite type', () => {
      expect(isCompositeType(new GraphQLList(InputObjectType))).toEqual(false);
      expect(() => assertCompositeType(new GraphQLList(InputObjectType))).toThrow();
    });
  });

  describe('isAbstractType', () => {
    it('returns true for interface and union types', () => {
      expect(isAbstractType(InterfaceType)).toEqual(true);
      expect(() => assertAbstractType(InterfaceType)).not.toThrow();
      expect(isAbstractType(UnionType)).toEqual(true);
      expect(() => assertAbstractType(UnionType)).not.toThrow();
    });

    it('returns false for wrapped abstract type', () => {
      expect(isAbstractType(new GraphQLList(InterfaceType))).toEqual(false);
      expect(() => assertAbstractType(new GraphQLList(InterfaceType))).toThrow();
    });

    it('returns false for non-abstract type', () => {
      expect(isAbstractType(ObjectType)).toEqual(false);
      expect(() => assertAbstractType(ObjectType)).toThrow();
    });

    it('returns false for wrapped non-abstract type', () => {
      expect(isAbstractType(new GraphQLList(ObjectType))).toEqual(false);
      expect(() => assertAbstractType(new GraphQLList(ObjectType))).toThrow();
    });
  });

  describe('isWrappingType', () => {
    it('returns true for list and non-null types', () => {
      expect(isWrappingType(new GraphQLList(ObjectType))).toEqual(true);
      expect(() => assertWrappingType(new GraphQLList(ObjectType))).not.toThrow();
      expect(isWrappingType(new GraphQLNonNull(ObjectType))).toEqual(true);
      expect(() => assertWrappingType(new GraphQLNonNull(ObjectType))).not.toThrow();
    });

    it('returns false for unwrapped types', () => {
      expect(isWrappingType(ObjectType)).toEqual(false);
      expect(() => assertWrappingType(ObjectType)).toThrow();
    });
  });

  describe('isNullableType', () => {
    it('returns true for unwrapped types', () => {
      expect(isNullableType(ObjectType)).toEqual(true);
      expect(() => assertNullableType(ObjectType)).not.toThrow();
    });

    it('returns true for list of non-null types', () => {
      expect(isNullableType(new GraphQLList(new GraphQLNonNull(ObjectType)))).toEqual(true);
      expect(() => assertNullableType(new GraphQLList(new GraphQLNonNull(ObjectType)))).not.toThrow();
    });

    it('returns false for non-null types', () => {
      expect(isNullableType(new GraphQLNonNull(ObjectType))).toEqual(false);
      expect(() => assertNullableType(new GraphQLNonNull(ObjectType))).toThrow();
    });
  });

  describe('getNullableType', () => {
    it('returns undefined for no type', () => {
      expect(getNullableType(undefined)).toEqual(undefined);
      expect(getNullableType(null)).toEqual(undefined);
    });

    it('returns self for a nullable type', () => {
      expect(getNullableType(ObjectType)).toEqual(ObjectType);
      const listOfObj = new GraphQLList(ObjectType);
      expect(getNullableType(listOfObj)).toEqual(listOfObj);
    });

    it('unwraps non-null type', () => {
      expect(getNullableType(new GraphQLNonNull(ObjectType))).toEqual(ObjectType);
    });
  });

  describe('isNamedType', () => {
    it('returns true for unwrapped types', () => {
      expect(isNamedType(ObjectType)).toEqual(true);
      expect(() => assertNamedType(ObjectType)).not.toThrow();
    });

    it('returns false for list and non-null types', () => {
      expect(isNamedType(new GraphQLList(ObjectType))).toEqual(false);
      expect(() => assertNamedType(new GraphQLList(ObjectType))).toThrow();
      expect(isNamedType(new GraphQLNonNull(ObjectType))).toEqual(false);
      expect(() => assertNamedType(new GraphQLNonNull(ObjectType))).toThrow();
    });
  });

  describe('getNamedType', () => {
    it('returns undefined for no type', () => {
      expect(getNamedType(undefined)).toEqual(undefined);
      expect(getNamedType(null)).toEqual(undefined);
    });

    it('returns self for a unwrapped type', () => {
      expect(getNamedType(ObjectType)).toEqual(ObjectType);
    });

    it('unwraps wrapper types', () => {
      expect(getNamedType(new GraphQLNonNull(ObjectType))).toEqual(ObjectType);
      expect(getNamedType(new GraphQLList(ObjectType))).toEqual(ObjectType);
    });

    it('unwraps deeply wrapper types', () => {
      expect(getNamedType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ObjectType))))).toEqual(ObjectType);
    });
  });

  describe('isRequiredArgument', () => {
    function buildArg(config: { type: GraphQLInputType; defaultValue?: unknown }): GraphQLArgument {
      return {
        name: 'someArg',
        type: config.type,
        description: undefined,
        defaultValue: config.defaultValue,
        deprecationReason: null,
        extensions: Object.create(null),
        astNode: undefined,
      };
    }

    it('returns true for required arguments', () => {
      const requiredArg = buildArg({
        type: new GraphQLNonNull(GraphQLString),
      });
      expect(isRequiredArgument(requiredArg)).toEqual(true);
    });

    it('returns false for optional arguments', () => {
      const optArg1 = buildArg({
        type: GraphQLString,
      });
      expect(isRequiredArgument(optArg1)).toEqual(false);

      const optArg2 = buildArg({
        type: GraphQLString,
        defaultValue: null,
      });
      expect(isRequiredArgument(optArg2)).toEqual(false);

      const optArg3 = buildArg({
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      });
      expect(isRequiredArgument(optArg3)).toEqual(false);

      const optArg4 = buildArg({
        type: new GraphQLNonNull(GraphQLString),
        defaultValue: 'default',
      });
      expect(isRequiredArgument(optArg4)).toEqual(false);
    });
  });

  describe('isRequiredInputField', () => {
    function buildInputField(config: { type: GraphQLInputType; defaultValue?: unknown }): GraphQLInputField {
      return {
        name: 'someInputField',
        type: config.type,
        description: undefined,
        defaultValue: config.defaultValue,
        deprecationReason: null,
        extensions: Object.create(null),
        astNode: undefined,
      };
    }

    it('returns true for required input field', () => {
      const requiredField = buildInputField({
        type: new GraphQLNonNull(GraphQLString),
      });
      expect(isRequiredInputField(requiredField)).toEqual(true);
    });

    it('returns false for optional input field', () => {
      const optField1 = buildInputField({
        type: GraphQLString,
      });
      expect(isRequiredInputField(optField1)).toEqual(false);

      const optField2 = buildInputField({
        type: GraphQLString,
        defaultValue: null,
      });
      expect(isRequiredInputField(optField2)).toEqual(false);

      const optField3 = buildInputField({
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      });
      expect(isRequiredInputField(optField3)).toEqual(false);

      const optField4 = buildInputField({
        type: new GraphQLNonNull(GraphQLString),
        defaultValue: 'default',
      });
      expect(isRequiredInputField(optField4)).toEqual(false);
    });
  });
});

describe('Directive predicates', () => {
  describe('isDirective', () => {
    it('returns true for spec defined directive', () => {
      expect(isDirective(GraphQLSkipDirective)).toEqual(true);
      expect(() => assertDirective(GraphQLSkipDirective)).not.toThrow();
    });

    it('returns true for custom directive', () => {
      expect(isDirective(Directive)).toEqual(true);
      expect(() => assertDirective(Directive)).not.toThrow();
    });

    it('returns false for directive class (rather than instance)', () => {
      expect(isDirective(GraphQLDirective)).toEqual(false);
      expect(() => assertDirective(GraphQLDirective)).toThrow();
    });

    it('returns false for non-directive', () => {
      expect(isDirective(EnumType)).toEqual(false);
      expect(() => assertDirective(EnumType)).toThrow();
      expect(isDirective(ScalarType)).toEqual(false);
      expect(() => assertDirective(ScalarType)).toThrow();
    });

    it('returns false for random garbage', () => {
      expect(isDirective({ what: 'is this' })).toEqual(false);
      expect(() => assertDirective({ what: 'is this' })).toThrow();
    });
  });
  describe('isSpecifiedDirective', () => {
    it('returns true for specified directives', () => {
      expect(isSpecifiedDirective(GraphQLIncludeDirective)).toEqual(true);
      expect(isSpecifiedDirective(GraphQLSkipDirective)).toEqual(true);
      expect(isSpecifiedDirective(GraphQLDeprecatedDirective)).toEqual(true);
    });

    it('returns false for custom directive', () => {
      expect(isSpecifiedDirective(Directive)).toEqual(false);
    });
  });
});

describe('Schema predicates', () => {
  const schema = new GraphQLSchema({});

  describe('isSchema/assertSchema', () => {
    it('returns true for schema', () => {
      expect(isSchema(schema)).toEqual(true);
      expect(() => assertSchema(schema)).not.toThrow();
    });

    it('returns false for schema class (rather than instance)', () => {
      expect(isSchema(GraphQLSchema)).toEqual(false);
      expect(() => assertSchema(GraphQLSchema)).toThrow();
    });

    it('returns false for non-schema', () => {
      expect(isSchema(EnumType)).toEqual(false);
      expect(() => assertSchema(EnumType)).toThrow();
      expect(isSchema(ScalarType)).toEqual(false);
      expect(() => assertSchema(ScalarType)).toThrow();
    });

    it('returns false for random garbage', () => {
      expect(isSchema({ what: 'is this' })).toEqual(false);
      expect(() => assertSchema({ what: 'is this' })).toThrow();
    });
  });
});
