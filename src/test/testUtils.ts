/* tslint:disable:no-unused-expression */

import { expect } from 'chai';

import { healSchema } from '../utils';
import { makeExecutableSchema } from '../makeExecutableSchema';
import { GraphQLObjectType, GraphQLObjectTypeConfig } from 'graphql';

describe('heal', () => {
  it('should prune empty types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      type WillBeEmptyObject {
        willBeRemoved: String
      }

      type Query {
        someQuery: WillBeEmptyObject
      }
      `
    });
    const originalTypeMap = schema.getTypeMap();

    const config = originalTypeMap['WillBeEmptyObject'].toConfig() as GraphQLObjectTypeConfig<any, any>;
    originalTypeMap['WillBeEmptyObject'] = new GraphQLObjectType({
      ...config,
      fields: {},
    });

    healSchema(schema);

    const healedTypeMap = schema.getTypeMap();
    expect(healedTypeMap).not.to.haveOwnProperty('WillBeEmptyObject');
  });
});
