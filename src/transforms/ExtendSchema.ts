/* tslint:disable:no-unused-expression */

import { GraphQLSchema, extendSchema, parse, } from 'graphql';
import { IFieldResolver, IResolvers } from '../Interfaces';
import { Transform } from './transforms';
import { addResolveFunctionsToSchema } from '../generate';

export default class ExtendSchema implements Transform {
  private typeDefs: string;
  private resolvers: IResolvers;
  private defaultFieldResolver: IFieldResolver<any, any>;

  constructor({
    typeDefs,
    resolvers = {},
    defaultFieldResolver,
  }: {
    typeDefs?: string;
    resolvers?: IResolvers;
    defaultFieldResolver?: IFieldResolver<any, any>,
    }) {
    this.typeDefs = typeDefs;
    this.resolvers = resolvers,
    this.defaultFieldResolver = defaultFieldResolver;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    let newSchema: GraphQLSchema;

    if (this.typeDefs) {
      newSchema = extendSchema(schema, parse(this.typeDefs));
    }

    return addResolveFunctionsToSchema({
      schema: newSchema || schema,
      resolvers: this.resolvers,
      defaultFieldResolver: this.defaultFieldResolver,
    });
  }
}
