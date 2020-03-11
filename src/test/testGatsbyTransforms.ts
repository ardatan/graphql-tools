import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLNonNull,
  graphql,
} from 'graphql';
import { createHttpLink } from 'apollo-link-http';
import fetch from 'node-fetch';

import { VisitSchemaKind } from '../Interfaces';
import { transformSchema, RenameTypes } from '../transforms';
import { introspectSchema } from '../stitching';
import { cloneType, healSchema, visitSchema } from '../utils';

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
    const link = createHttpLink({
      uri: 'https://countries.trevorblades.com/',
      fetch: (fetch as unknown) as WindowOrWorkerGlobalScope['fetch'],
    });
    const introspectionSchema = await introspectSchema(link);
    const typeName = 'CountriesQuery';
    const fieldName = 'countries';
    const resolver = () => ({});

    const schema = transformSchema(
      {
        schema: introspectionSchema,
        link,
      },
      [
        new StripNonQueryTransform(),
        new RenameTypes(name => `${typeName}_${name}`),
        new NamespaceUnderFieldTransform({
          typeName,
          fieldName,
          resolver,
        }),
      ],
    );

    expect(schema).to.be.instanceOf(GraphQLSchema);

    const result = await graphql(
      schema,
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
            name: 'English',
          },
        },
      },
    });
  });
});
