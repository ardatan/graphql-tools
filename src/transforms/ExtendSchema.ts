/* tslint:disable:no-unused-expression */

import { GraphQLSchema, extendSchema, parse, } from 'graphql';
import { IFieldResolver, IResolvers, Request } from '../Interfaces';
import { Transform } from './transforms';
import { addResolveFunctionsToSchema } from '../generate';
import { defaultMergedResolver } from '../stitching';
import { default as MapFields, FieldNodeTransformerMap } from './MapFields';

export default class ExtendSchema implements Transform {
  private typeDefs: string;
  private resolvers: IResolvers;
  private defaultFieldResolver: IFieldResolver<any, any>;
  private transformer: Transform;

  constructor({
    typeDefs,
    resolvers = {},
    defaultFieldResolver,
    fieldNodeTransformerMap,
  }: {
    typeDefs?: string;
    resolvers?: IResolvers;
    defaultFieldResolver?: IFieldResolver<any, any>;
    fieldNodeTransformerMap?: FieldNodeTransformerMap;
    }) {
    this.typeDefs = typeDefs;
    this.resolvers = resolvers,
    this.defaultFieldResolver = defaultFieldResolver || defaultMergedResolver;
    this.transformer = new MapFields(fieldNodeTransformerMap);
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    this.transformer.transformSchema(schema);

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

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
