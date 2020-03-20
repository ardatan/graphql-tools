import { expect } from 'chai';
import { GraphQLObjectType, GraphQLSchema, graphqlSync } from 'graphql';

import { makeExecutableSchema, mapSchema } from '../index';
import { MapperKind } from '../Interfaces';
import { toConfig } from '../polyfills';

describe('mapSchema', () => {
  it('does not throw', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: String
        }
      `,
    });

    const newSchema = mapSchema(schema, {});
    expect(newSchema).to.be.instanceOf(GraphQLSchema);
  });

  it('can add a resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: Int
        }
      `,
    });

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const queryConfig = toConfig(type);
        queryConfig.fields.version.resolve = () => 1;
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).to.be.instanceOf(GraphQLSchema);

    const result = graphqlSync(newSchema, '{ version }');
    expect(result.data.version).to.equal(1);
  });

  it('can change the root query name', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: Int
        }
      `,
    });

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: type => {
        const queryConfig = toConfig(type);
        queryConfig.name = 'RootQuery';
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).to.be.instanceOf(GraphQLSchema);
    expect(newSchema.getQueryType().name).to.equal('RootQuery');
  });
});
