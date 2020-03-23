import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLNonNull,
  graphql,
} from 'graphql';

import { VisitSchemaKind } from '../Interfaces';
import { transformSchema, RenameTypes } from '../wrap/index';
import { cloneType, healSchema, visitSchema } from '../utils/index';
import { makeExecutableSchema } from '../generate/index';
import { addMocksToSchema } from '../mock/index';

// see https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/transforms.js
// and https://github.com/gatsbyjs/gatsby/issues/22128

class NamespaceUnderFieldTransform {
  private readonly typeName: string;
  private readonly fieldName: string;
  private readonly resolver: GraphQLFieldResolver<any, any>;

  constructor({
    typeName,
    fieldName,
    resolver,
  }: {
    typeName: string;
    fieldName: string;
    resolver: GraphQLFieldResolver<any, any>;
  }) {
    this.typeName = typeName;
    this.fieldName = fieldName;
    this.resolver = resolver;
  }

  transformSchema(schema: GraphQLSchema) {
    const query = schema.getQueryType();

    const nestedType = cloneType(query);
    nestedType.name = this.typeName;

    const typeMap = schema.getTypeMap();
    typeMap[this.typeName] = nestedType;

    const newQuery = new GraphQLObjectType({
      name: query.name,
      fields: {
        [this.fieldName]: {
          type: new GraphQLNonNull(nestedType),
          resolve: (parent, args, context, info) => {
            if (this.resolver != null) {
              return this.resolver(parent, args, context, info);
            }

            return {};
          },
        },
      },
    });
    typeMap[query.name] = newQuery;

    return healSchema(schema);
  }
}

class StripNonQueryTransform {
  transformSchema(schema: GraphQLSchema) {
    return visitSchema(schema, {
      [VisitSchemaKind.MUTATION]() {
        return null;
      },
      [VisitSchemaKind.SUBSCRIPTION]() {
        return null;
      },
    });
  }
}

describe('Gatsby transforms', () => {
  it('work', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT | INTERFACE

      enum CacheControlScope {
        PUBLIC
        PRIVATE
      }

      type Continent {
        code: String
        name: String
        countries: [Country]
      }

      type Country {
        code: String
        name: String
        native: String
        phone: String
        continent: Continent
        currency: String
        languages: [Language]
        emoji: String
        emojiU: String
        states: [State]
      }

      type Language {
        code: String
        name: String
        native: String
        rtl: Int
      }

      type Query {
        continents: [Continent]
        continent(code: String): Continent
        countries: [Country]
        country(code: String): Country
        languages: [Language]
        language(code: String): Language
      }

      type State {
        code: String
        name: String
        country: Country
      }

      scalar Upload
      `,
    });

    addMocksToSchema({ schema });

    const transformedSchema = transformSchema(schema, [
      new StripNonQueryTransform(),
      new RenameTypes(name => `CountriesQuery_${name}`),
      new NamespaceUnderFieldTransform({
        typeName: 'CountriesQuery',
        fieldName: 'countries',
        resolver: () => ({}),
      }),
    ]);

    expect(transformedSchema).to.be.instanceOf(GraphQLSchema);

    const result = await graphql(
      transformedSchema,
      `
        {
          countries {
            language(code: "en") {
              name
            }
          }
        }
      `,
    );
    expect(result).to.deep.equal({
      data: {
        countries: {
          language: {
            name: 'Hello World',
          },
        },
      },
    });
  });
});
