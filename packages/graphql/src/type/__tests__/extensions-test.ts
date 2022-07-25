import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
} from '../definition.js';
import { GraphQLDirective } from '../directives.js';
import { GraphQLSchema } from '../schema.js';

const dummyType = new GraphQLScalarType({ name: 'DummyScalar' });

function expectObjMap(value: unknown) {
  expect(value != null && typeof value === 'object').toBeTruthy();
  expect(Object.getPrototypeOf(value)).toEqual(null);
  return expect(value);
}

describe('Type System: Extensions', () => {
  describe('GraphQLScalarType', () => {
    it('without extensions', () => {
      const someScalar = new GraphQLScalarType({ name: 'SomeScalar' });
      expect(someScalar.extensions).toEqual({});

      const config = someScalar.toConfig();
      expect(config.extensions).toEqual({});
    });

    it('with extensions', () => {
      const scalarExtensions = Object.freeze({ SomeScalarExt: 'scalar' });
      const someScalar = new GraphQLScalarType({
        name: 'SomeScalar',
        extensions: scalarExtensions,
      });

      expectObjMap(someScalar.extensions).toEqual(scalarExtensions);

      const config = someScalar.toConfig();
      expectObjMap(config.extensions).toEqual(scalarExtensions);
    });
  });

  describe('GraphQLObjectType', () => {
    it('without extensions', () => {
      const someObject = new GraphQLObjectType({
        name: 'SomeObject',
        fields: {
          someField: {
            type: dummyType,
            args: {
              someArg: {
                type: dummyType,
              },
            },
          },
        },
      });

      expect(someObject.extensions).toEqual({});
      const someField = someObject.getFields().someField;
      expect(someField.extensions).toEqual({});
      const someArg = someField.args[0];
      expect(someArg.extensions).toEqual({});

      const config = someObject.toConfig();
      expect(config.extensions).toEqual({});
      const someFieldConfig = config.fields.someField;
      expect(someFieldConfig.extensions).toEqual({});
      expect(someFieldConfig.args != null).toBeTruthy();
      // @ts-expect-error
      const someArgConfig = someFieldConfig.args.someArg;
      expect(someArgConfig.extensions).toEqual({});
    });

    it('with extensions', () => {
      const objectExtensions = Object.freeze({ SomeObjectExt: 'object' });
      const fieldExtensions = Object.freeze({ SomeFieldExt: 'field' });
      const argExtensions = Object.freeze({ SomeArgExt: 'arg' });

      const someObject = new GraphQLObjectType({
        name: 'SomeObject',
        fields: {
          someField: {
            type: dummyType,
            args: {
              someArg: {
                type: dummyType,
                extensions: argExtensions,
              },
            },
            extensions: fieldExtensions,
          },
        },
        extensions: objectExtensions,
      });

      expectObjMap(someObject.extensions).toEqual(objectExtensions);
      const someField = someObject.getFields().someField;
      expectObjMap(someField.extensions).toEqual(fieldExtensions);
      const someArg = someField.args[0];
      expectObjMap(someArg.extensions).toEqual(argExtensions);

      const config = someObject.toConfig();
      expectObjMap(config.extensions).toEqual(objectExtensions);
      const someFieldConfig = config.fields.someField;
      expectObjMap(someFieldConfig.extensions).toEqual(fieldExtensions);
      expect(someFieldConfig.args != null).toBeTruthy();
      // @ts-expect-error
      const someArgConfig = someFieldConfig.args.someArg;
      expectObjMap(someArgConfig.extensions).toEqual(argExtensions);
    });
  });

  describe('GraphQLInterfaceType', () => {
    it('without extensions', () => {
      const someInterface = new GraphQLInterfaceType({
        name: 'SomeInterface',
        fields: {
          someField: {
            type: dummyType,
            args: {
              someArg: {
                type: dummyType,
              },
            },
          },
        },
      });

      expect(someInterface.extensions).toEqual({});
      const someField = someInterface.getFields().someField;
      expect(someField.extensions).toEqual({});
      const someArg = someField.args[0];
      expect(someArg.extensions).toEqual({});

      const config = someInterface.toConfig();
      expect(config.extensions).toEqual({});
      const someFieldConfig = config.fields.someField;
      expect(someFieldConfig.extensions).toEqual({});
      expect(someFieldConfig.args != null).toBeTruthy();
      // @ts-expect-error
      const someArgConfig = someFieldConfig.args.someArg;
      expect(someArgConfig.extensions).toEqual({});
    });

    it('with extensions', () => {
      const interfaceExtensions = Object.freeze({
        SomeInterfaceExt: 'interface',
      });
      const fieldExtensions = Object.freeze({ SomeFieldExt: 'field' });
      const argExtensions = Object.freeze({ SomeArgExt: 'arg' });

      const someInterface = new GraphQLInterfaceType({
        name: 'SomeInterface',
        fields: {
          someField: {
            type: dummyType,
            args: {
              someArg: {
                type: dummyType,
                extensions: argExtensions,
              },
            },
            extensions: fieldExtensions,
          },
        },
        extensions: interfaceExtensions,
      });

      expectObjMap(someInterface.extensions).toEqual(interfaceExtensions);
      const someField = someInterface.getFields().someField;
      expectObjMap(someField.extensions).toEqual(fieldExtensions);
      const someArg = someField.args[0];
      expectObjMap(someArg.extensions).toEqual(argExtensions);

      const config = someInterface.toConfig();
      expectObjMap(config.extensions).toEqual(interfaceExtensions);
      const someFieldConfig = config.fields.someField;
      expectObjMap(someFieldConfig.extensions).toEqual(fieldExtensions);
      expect(someFieldConfig.args != null).toBeTruthy();
      // @ts-expect-error
      const someArgConfig = someFieldConfig.args.someArg;
      expectObjMap(someArgConfig.extensions).toEqual(argExtensions);
    });
  });

  describe('GraphQLUnionType', () => {
    it('without extensions', () => {
      const someUnion = new GraphQLUnionType({
        name: 'SomeUnion',
        types: [],
      });

      expect(someUnion.extensions).toEqual({});

      const config = someUnion.toConfig();
      expect(config.extensions).toEqual({});
    });

    it('with extensions', () => {
      const unionExtensions = Object.freeze({ SomeUnionExt: 'union' });

      const someUnion = new GraphQLUnionType({
        name: 'SomeUnion',
        types: [],
        extensions: unionExtensions,
      });

      expectObjMap(someUnion.extensions).toEqual(unionExtensions);

      const config = someUnion.toConfig();
      expectObjMap(config.extensions).toEqual(unionExtensions);
    });
  });

  describe('GraphQLEnumType', () => {
    it('without extensions', () => {
      const someEnum = new GraphQLEnumType({
        name: 'SomeEnum',
        values: {
          SOME_VALUE: {},
        },
      });

      expect(someEnum.extensions).toEqual({});
      const someValue = someEnum.getValues()[0];
      expect(someValue.extensions).toEqual({});

      const config = someEnum.toConfig();
      expect(config.extensions).toEqual({});
      const someValueConfig = config.values.SOME_VALUE;
      expect(someValueConfig.extensions).toEqual({});
    });

    it('with extensions', () => {
      const enumExtensions = Object.freeze({ SomeEnumExt: 'enum' });
      const valueExtensions = Object.freeze({ SomeValueExt: 'value' });

      const someEnum = new GraphQLEnumType({
        name: 'SomeEnum',
        values: {
          SOME_VALUE: {
            extensions: valueExtensions,
          },
        },
        extensions: enumExtensions,
      });

      expectObjMap(someEnum.extensions).toEqual(enumExtensions);
      const someValue = someEnum.getValues()[0];
      expectObjMap(someValue.extensions).toEqual(valueExtensions);

      const config = someEnum.toConfig();
      expectObjMap(config.extensions).toEqual(enumExtensions);
      const someValueConfig = config.values.SOME_VALUE;
      expectObjMap(someValueConfig.extensions).toEqual(valueExtensions);
    });
  });

  describe('GraphQLInputObjectType', () => {
    it('without extensions', () => {
      const someInputObject = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          someInputField: {
            type: dummyType,
          },
        },
      });

      expect(someInputObject.extensions).toEqual({});
      const someInputField = someInputObject.getFields().someInputField;
      expect(someInputField.extensions).toEqual({});

      const config = someInputObject.toConfig();
      expect(config.extensions).toEqual({});
      const someInputFieldConfig = config.fields.someInputField;
      expect(someInputFieldConfig.extensions).toEqual({});
    });

    it('with extensions', () => {
      const inputObjectExtensions = Object.freeze({
        SomeInputObjectExt: 'inputObject',
      });
      const inputFieldExtensions = Object.freeze({
        SomeInputFieldExt: 'inputField',
      });

      const someInputObject = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: {
          someInputField: {
            type: dummyType,
            extensions: inputFieldExtensions,
          },
        },
        extensions: inputObjectExtensions,
      });

      expectObjMap(someInputObject.extensions).toEqual(inputObjectExtensions);
      const someInputField = someInputObject.getFields().someInputField;
      expectObjMap(someInputField.extensions).toEqual(inputFieldExtensions);

      const config = someInputObject.toConfig();
      expectObjMap(config.extensions).toEqual(inputObjectExtensions);
      const someInputFieldConfig = config.fields.someInputField;
      expectObjMap(someInputFieldConfig.extensions).toEqual(inputFieldExtensions);
    });
  });

  describe('GraphQLDirective', () => {
    it('without extensions', () => {
      const someDirective = new GraphQLDirective({
        name: 'SomeDirective',
        args: {
          someArg: {
            type: dummyType,
          },
        },
        locations: [],
      });

      expect(someDirective.extensions).toEqual({});
      const someArg = someDirective.args[0];
      expect(someArg.extensions).toEqual({});

      const config = someDirective.toConfig();
      expect(config.extensions).toEqual({});
      const someArgConfig = config.args.someArg;
      expect(someArgConfig.extensions).toEqual({});
    });

    it('with extensions', () => {
      const directiveExtensions = Object.freeze({
        SomeDirectiveExt: 'directive',
      });
      const argExtensions = Object.freeze({ SomeArgExt: 'arg' });

      const someDirective = new GraphQLDirective({
        name: 'SomeDirective',
        args: {
          someArg: {
            type: dummyType,
            extensions: argExtensions,
          },
        },
        locations: [],
        extensions: directiveExtensions,
      });

      expectObjMap(someDirective.extensions).toEqual(directiveExtensions);
      const someArg = someDirective.args[0];
      expectObjMap(someArg.extensions).toEqual(argExtensions);

      const config = someDirective.toConfig();
      expectObjMap(config.extensions).toEqual(directiveExtensions);
      const someArgConfig = config.args.someArg;
      expectObjMap(someArgConfig.extensions).toEqual(argExtensions);
    });
  });

  describe('GraphQLSchema', () => {
    it('without extensions', () => {
      const schema = new GraphQLSchema({});

      expect(schema.extensions).toEqual({});

      const config = schema.toConfig();
      expect(config.extensions).toEqual({});
    });

    it('with extensions', () => {
      const schemaExtensions = Object.freeze({
        schemaExtension: 'schema',
      });

      const schema = new GraphQLSchema({ extensions: schemaExtensions });

      expectObjMap(schema.extensions).toEqual(schemaExtensions);

      const config = schema.toConfig();
      expectObjMap(config.extensions).toEqual(schemaExtensions);
    });
  });
});
