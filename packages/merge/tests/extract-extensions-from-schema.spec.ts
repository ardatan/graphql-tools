import { buildSchema, GraphQLEnumType, GraphQLSchema, printSchema, buildClientSchema, buildASTSchema, parse } from 'graphql';
import { extractExtensionsFromSchema, mergeExtensions, applyExtensions } from '../src/extensions'

describe('extensions', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    schema = buildSchema(/* GraphQL */`
      scalar MyScalar

      type Query {
        t(i: MyInput): MyType
      }

      input MyInput {
        foo: String
      }

      type MyType implements Node {
        id: ID!
        f: String
      }

      type MyOtherType {
        foo: String
      }

      interface Node {
        id: ID!
      }

      enum MyEnum {
        A
        B
        C
      }

      union MyUnion = MyType | MyOtherType
    `);
  })

  describe('extractExtensionsFromSchema', () => {
    it('Should extract scheme extensions', () => {
      schema.extensions = { schema: true };
      const result = extractExtensionsFromSchema(schema);
      expect(result.schemaExtensions).toEqual({ schema: true })
    });

    it('Should extract extensions correctly for all possible types', () => {
      schema.getType('MyInput').extensions = { input: true };
      schema.getType('MyType').extensions = { type: true };
      schema.getType('Node').extensions = { interface: true };
      schema.getType('MyEnum').extensions = { enum: true };
      schema.getType('MyUnion').extensions = { union: true };
      schema.getType('MyScalar').extensions = { scalar: true };

      const { types: extensions } = extractExtensionsFromSchema(schema);
      expect(extensions.MyInput.extensions).toEqual({ input: true })
      expect(extensions.MyType.extensions).toEqual({ type: true })
      expect(extensions.Node.extensions).toEqual({ interface: true })
      expect(extensions.MyEnum.extensions).toEqual({ enum: true })
      expect(extensions.MyUnion.extensions).toEqual({ union: true })
      expect(extensions.MyScalar.extensions).toEqual({ scalar: true })
    });

    it('Should extract extensions correctly for fields arguments', () => {
        schema.getQueryType().getFields().t.args[0].extensions = { fieldArg: true };

        const { types: extensions } = extractExtensionsFromSchema(schema);
        expect(extensions.Query.fields.t.arguments.i).toEqual({ fieldArg: true })
    });

    it('Should extract extensions correctly for enum values', () => {
        (schema.getType('MyEnum') as GraphQLEnumType).getValues()[0].extensions = { enumValue: true };

        const { types: extensions } = extractExtensionsFromSchema(schema);
        expect(extensions.MyEnum.values.A).toEqual({ enumValue: true });
        expect(extensions.MyEnum.values.B).toEqual({});
        expect(extensions.MyEnum.values.C).toEqual({});
    });

    it('Should extract extensions correctly for fields', () => {
        schema.getQueryType().getFields().t.extensions = { field: true };

        const { types: extensions } = extractExtensionsFromSchema(schema);
        expect(extensions.Query.fields.t.extensions).toEqual({ field: true })
    });

    it('Should extract extensions correctly for input fields', () => {
        (schema.getType('MyInput') as any).getFields().foo.extensions = { inputField: true };

        const { types: extensions } = extractExtensionsFromSchema(schema);
        expect(extensions.MyInput.fields.foo.extensions).toEqual({ inputField: true })
    });
  });

  describe('mergeExtensions', () => {
    it('Should merge all extensions from 2 schemas correctly', () => {
      schema.getQueryType().extensions = { queryTest: true };
      const secondSchema = buildSchema(/* GraphQL */`
        type Query {
          foo: String!
        }
      `);
      secondSchema.getQueryType().extensions = { querySecondTest: true };

      const extensions = extractExtensionsFromSchema(schema);
      const secondExtensions = extractExtensionsFromSchema(secondSchema);
      const mergedExtensions = mergeExtensions([extensions, secondExtensions]);
      expect(mergedExtensions.types.Query.extensions).toEqual({ queryTest: true, querySecondTest: true })
    })
  });

  describe('applyExtensionsToSchema', () => {
    it('Should re apply extensions to schema and types correctly', () => {
      schema.extensions = { schema: true };
      schema.getType('MyInput').extensions = { input: true };
      schema.getType('MyType').extensions = { type: true };
      schema.getType('Node').extensions = { interface: true };
      schema.getType('MyEnum').extensions = { enum: true };
      schema.getType('MyUnion').extensions = { union: true };
      schema.getType('MyScalar').extensions = { scalar: true };
      (schema.getType('MyInput') as any).getFields().foo.extensions = { inputField: true };
      schema.getQueryType().getFields().t.extensions = { field: true };
      (schema.getType('MyEnum') as GraphQLEnumType).getValues()[0].extensions = { enumValue: true };
      schema.getQueryType().getFields().t.args[0].extensions = { fieldArg: true };

      const result = extractExtensionsFromSchema(schema);
      const cleanSchema = buildASTSchema(parse(printSchema(schema)));

      // To make sure it's stripped
      expect(cleanSchema.getType('MyInput').extensions).toBeUndefined();

      const modifiedSchema = applyExtensions(cleanSchema, result);
      
      expect(modifiedSchema.extensions).toEqual({ schema: true })
      expect(modifiedSchema.getType('MyInput').extensions).toEqual({ input: true });
      expect(modifiedSchema.getType('MyType').extensions).toEqual({ type: true });
      expect(modifiedSchema.getType('Node').extensions).toEqual({ interface: true });
      expect(modifiedSchema.getType('MyEnum').extensions).toEqual({ enum: true });
      expect(modifiedSchema.getType('MyUnion').extensions).toEqual({ union: true });
      expect(modifiedSchema.getType('MyScalar').extensions).toEqual({ scalar: true });
      expect((modifiedSchema.getType('MyInput') as any).getFields().foo.extensions).toEqual({ inputField: true });
      expect(modifiedSchema.getQueryType().getFields().t.extensions).toEqual({ field: true });
      expect((modifiedSchema.getType('MyEnum') as GraphQLEnumType).getValues()[0].extensions).toEqual({ enumValue: true });
      expect(modifiedSchema.getQueryType().getFields().t.args[0].extensions).toEqual({ fieldArg: true });
    });
  })
});