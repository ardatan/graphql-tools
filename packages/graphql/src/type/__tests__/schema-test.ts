import { dedent } from '../../__testUtils__/dedent.js';

import { DirectiveLocation } from '../../language/directiveLocation.js';

import { printSchema } from '../../utilities/printSchema.js';

import type { GraphQLCompositeType } from '../definition.js';
import {
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
} from '../definition.js';
import { GraphQLDirective } from '../directives.js';
import { SchemaMetaFieldDef, TypeMetaFieldDef, TypeNameMetaFieldDef } from '../introspection.js';
import { GraphQLBoolean, GraphQLInt, GraphQLString } from '../scalars.js';
import { GraphQLSchema } from '../schema.js';

describe('Type System: Schema', () => {
  it('Define sample schema', () => {
    const BlogImage = new GraphQLObjectType({
      name: 'Image',
      fields: {
        url: { type: GraphQLString },
        width: { type: GraphQLInt },
        height: { type: GraphQLInt },
      },
    });

    const BlogAuthor: GraphQLObjectType = new GraphQLObjectType({
      name: 'Author',
      fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        pic: {
          args: { width: { type: GraphQLInt }, height: { type: GraphQLInt } },
          type: BlogImage,
        },
        recentArticle: { type: BlogArticle },
      }),
    });

    const BlogArticle: GraphQLObjectType = new GraphQLObjectType({
      name: 'Article',
      fields: {
        id: { type: GraphQLString },
        isPublished: { type: GraphQLBoolean },
        author: { type: BlogAuthor },
        title: { type: GraphQLString },
        body: { type: GraphQLString },
      },
    });

    const BlogQuery = new GraphQLObjectType({
      name: 'Query',
      fields: {
        article: {
          args: { id: { type: GraphQLString } },
          type: BlogArticle,
        },
        feed: {
          type: new GraphQLList(BlogArticle),
        },
      },
    });

    const BlogMutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: {
        writeArticle: {
          type: BlogArticle,
        },
      },
    });

    const BlogSubscription = new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        articleSubscribe: {
          args: { id: { type: GraphQLString } },
          type: BlogArticle,
        },
      },
    });

    const schema = new GraphQLSchema({
      description: 'Sample schema',
      query: BlogQuery,
      mutation: BlogMutation,
      subscription: BlogSubscription,
    });

    expect(printSchema(schema)).toEqual(dedent`
      """Sample schema"""
      schema {
        query: Query
        mutation: Mutation
        subscription: Subscription
      }

      type Query {
        article(id: String): Article
        feed: [Article]
      }

      type Article {
        id: String
        isPublished: Boolean
        author: Author
        title: String
        body: String
      }

      type Author {
        id: String
        name: String
        pic(width: Int, height: Int): Image
        recentArticle: Article
      }

      type Image {
        url: String
        width: Int
        height: Int
      }

      type Mutation {
        writeArticle: Article
      }

      type Subscription {
        articleSubscribe(id: String): Article
      }
    `);
  });

  describe('Root types', () => {
    const testType = new GraphQLObjectType({ name: 'TestType', fields: {} });

    it('defines a query root', () => {
      const schema = new GraphQLSchema({ query: testType });
      expect(schema.getQueryType()).toEqual(testType);
      expect(Object.keys(schema.getTypeMap())).toContain('TestType');
    });

    it('defines a mutation root', () => {
      const schema = new GraphQLSchema({ mutation: testType });
      expect(schema.getMutationType()).toEqual(testType);
      expect(Object.keys(schema.getTypeMap())).toContain('TestType');
    });

    it('defines a subscription root', () => {
      const schema = new GraphQLSchema({ subscription: testType });
      expect(schema.getSubscriptionType()).toEqual(testType);
      expect(Object.keys(schema.getTypeMap())).toContain('TestType');
    });
  });

  describe('Type Map', () => {
    it('includes interface possible types in the type map', () => {
      const SomeInterface = new GraphQLInterfaceType({
        name: 'SomeInterface',
        fields: {},
      });

      const SomeSubtype = new GraphQLObjectType({
        name: 'SomeSubtype',
        fields: {},
        interfaces: [SomeInterface],
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            iface: { type: SomeInterface },
          },
        }),
        types: [SomeSubtype],
      });

      expect(schema.getType('SomeInterface')).toEqual(SomeInterface);
      expect(schema.getType('SomeSubtype')).toEqual(SomeSubtype);

      expect(schema.isSubType(SomeInterface, SomeSubtype)).toEqual(true);
    });

    it("includes interface's thunk subtypes in the type map", () => {
      const SomeInterface = new GraphQLInterfaceType({
        name: 'SomeInterface',
        fields: {},
        interfaces: () => [AnotherInterface],
      });

      const AnotherInterface = new GraphQLInterfaceType({
        name: 'AnotherInterface',
        fields: {},
      });

      const SomeSubtype = new GraphQLObjectType({
        name: 'SomeSubtype',
        fields: {},
        interfaces: () => [SomeInterface],
      });

      const schema = new GraphQLSchema({ types: [SomeSubtype] });

      expect(schema.getType('SomeInterface')).toEqual(SomeInterface);
      expect(schema.getType('AnotherInterface')).toEqual(AnotherInterface);
      expect(schema.getType('SomeSubtype')).toEqual(SomeSubtype);
    });

    it('includes nested input objects in the map', () => {
      const NestedInputObject = new GraphQLInputObjectType({
        name: 'NestedInputObject',
        fields: {},
      });

      const SomeInputObject = new GraphQLInputObjectType({
        name: 'SomeInputObject',
        fields: { nested: { type: NestedInputObject } },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            something: {
              type: GraphQLString,
              args: { input: { type: SomeInputObject } },
            },
          },
        }),
      });

      expect(schema.getType('SomeInputObject')).toEqual(SomeInputObject);
      expect(schema.getType('NestedInputObject')).toEqual(NestedInputObject);
    });

    it('includes input types only used in directives', () => {
      const directive = new GraphQLDirective({
        name: 'dir',
        locations: [DirectiveLocation.OBJECT],
        args: {
          arg: {
            type: new GraphQLInputObjectType({ name: 'Foo', fields: {} }),
          },
          argList: {
            type: new GraphQLList(new GraphQLInputObjectType({ name: 'Bar', fields: {} })),
          },
        },
      });
      const schema = new GraphQLSchema({ directives: [directive] });

      expect(Object.keys(schema.getTypeMap())).toContain('Foo');
      expect(Object.keys(schema.getTypeMap())).toContain('Bar');
    });
  });

  it('preserves the order of user provided types', () => {
    const aType = new GraphQLObjectType({
      name: 'A',
      fields: {
        sub: { type: new GraphQLScalarType({ name: 'ASub' }) },
      },
    });
    const zType = new GraphQLObjectType({
      name: 'Z',
      fields: {
        sub: { type: new GraphQLScalarType({ name: 'ZSub' }) },
      },
    });
    const queryType = new GraphQLObjectType({
      name: 'Query',
      fields: {
        a: { type: aType },
        z: { type: zType },
        sub: { type: new GraphQLScalarType({ name: 'QuerySub' }) },
      },
    });
    const schema = new GraphQLSchema({
      types: [zType, queryType, aType],
      query: queryType,
    });

    const typeNames = Object.keys(schema.getTypeMap());
    expect(typeNames).toEqual([
      'Z',
      'ZSub',
      'Query',
      'QuerySub',
      'A',
      'ASub',
      'Boolean',
      'String',
      '__Schema',
      '__Type',
      '__TypeKind',
      '__Field',
      '__InputValue',
      '__EnumValue',
      '__Directive',
      '__DirectiveLocation',
    ]);

    // Also check that this order is stable
    const copySchema = new GraphQLSchema(schema.toConfig());
    expect(Object.keys(copySchema.getTypeMap())).toEqual(typeNames);
  });

  it('can be Object.toStringified', () => {
    const schema = new GraphQLSchema({});

    expect(Object.prototype.toString.call(schema)).toEqual('[object GraphQLSchema]');
  });

  describe('getField', () => {
    const petType = new GraphQLInterfaceType({
      name: 'Pet',
      fields: {
        name: { type: GraphQLString },
      },
    });

    const catType = new GraphQLObjectType({
      name: 'Cat',
      interfaces: [petType],
      fields: {
        name: { type: GraphQLString },
      },
    });

    const dogType = new GraphQLObjectType({
      name: 'Dog',
      interfaces: [petType],
      fields: {
        name: { type: GraphQLString },
      },
    });

    const catOrDog = new GraphQLUnionType({
      name: 'CatOrDog',
      types: [catType, dogType],
    });

    const queryType = new GraphQLObjectType({
      name: 'Query',
      fields: {
        catOrDog: { type: catOrDog },
      },
    });

    const mutationType = new GraphQLObjectType({
      name: 'Mutation',
      fields: {},
    });

    const subscriptionType = new GraphQLObjectType({
      name: 'Subscription',
      fields: {},
    });

    const schema = new GraphQLSchema({
      query: queryType,
      mutation: mutationType,
      subscription: subscriptionType,
    });

    function expectField(parentType: GraphQLCompositeType, name: string) {
      return expect(schema.getField(parentType, name));
    }

    it('returns known fields', () => {
      expectField(petType, 'name').toEqual(petType.getFields().name);
      expectField(catType, 'name').toEqual(catType.getFields().name);

      expectField(queryType, 'catOrDog').toEqual(queryType.getFields().catOrDog);
    });

    it('returns `undefined` for unknown fields', () => {
      expectField(catOrDog, 'name').toEqual(undefined);

      expectField(queryType, 'unknown').toEqual(undefined);
      expectField(petType, 'unknown').toEqual(undefined);
      expectField(catType, 'unknown').toEqual(undefined);
      expectField(catOrDog, 'unknown').toEqual(undefined);
    });

    it('handles introspection fields', () => {
      expectField(queryType, '__typename').toEqual(TypeNameMetaFieldDef);
      expectField(mutationType, '__typename').toEqual(TypeNameMetaFieldDef);
      expectField(subscriptionType, '__typename').toEqual(TypeNameMetaFieldDef);

      expectField(petType, '__typename').toEqual(TypeNameMetaFieldDef);
      expectField(catType, '__typename').toEqual(TypeNameMetaFieldDef);
      expectField(dogType, '__typename').toEqual(TypeNameMetaFieldDef);
      expectField(catOrDog, '__typename').toEqual(TypeNameMetaFieldDef);

      expectField(queryType, '__type').toEqual(TypeMetaFieldDef);
      expectField(queryType, '__schema').toEqual(SchemaMetaFieldDef);
    });

    it('returns `undefined` for introspection fields in wrong location', () => {
      expect(schema.getField(petType, '__type')).toEqual(undefined);
      expect(schema.getField(dogType, '__type')).toEqual(undefined);
      expect(schema.getField(mutationType, '__type')).toEqual(undefined);
      expect(schema.getField(subscriptionType, '__type')).toEqual(undefined);

      expect(schema.getField(petType, '__schema')).toEqual(undefined);
      expect(schema.getField(dogType, '__schema')).toEqual(undefined);
      expect(schema.getField(mutationType, '__schema')).toEqual(undefined);
      expect(schema.getField(subscriptionType, '__schema')).toEqual(undefined);
    });
  });

  describe('Validity', () => {
    describe('when not assumed valid', () => {
      it('configures the schema to still needing validation', () => {
        expect(
          new GraphQLSchema({
            assumeValid: false,
          }).__validationErrors
        ).toEqual(undefined);
      });
    });

    describe('A Schema must contain uniquely named types', () => {
      it('rejects a Schema which redefines a built-in type', () => {
        const FakeString = new GraphQLScalarType({ name: 'String' });

        const QueryType = new GraphQLObjectType({
          name: 'Query',
          fields: {
            normal: { type: GraphQLString },
            fake: { type: FakeString },
          },
        });

        expect(() => new GraphQLSchema({ query: QueryType })).toThrow(
          'Schema must contain uniquely named types but contains multiple types named "String".'
        );
      });

      it('rejects a Schema which defines an object type twice', () => {
        const types = [
          new GraphQLObjectType({ name: 'SameName', fields: {} }),
          new GraphQLObjectType({ name: 'SameName', fields: {} }),
        ];

        expect(() => new GraphQLSchema({ types })).toThrow(
          'Schema must contain uniquely named types but contains multiple types named "SameName".'
        );
      });

      it('rejects a Schema which defines fields with conflicting types', () => {
        const fields = {};
        const QueryType = new GraphQLObjectType({
          name: 'Query',
          fields: {
            a: { type: new GraphQLObjectType({ name: 'SameName', fields }) },
            b: { type: new GraphQLObjectType({ name: 'SameName', fields }) },
          },
        });

        expect(() => new GraphQLSchema({ query: QueryType })).toThrow(
          'Schema must contain uniquely named types but contains multiple types named "SameName".'
        );
      });
    });

    describe('when assumed valid', () => {
      it('configures the schema to have no errors', () => {
        expect(
          new GraphQLSchema({
            assumeValid: true,
          }).__validationErrors
        ).toEqual([]);
      });
    });
  });
});
