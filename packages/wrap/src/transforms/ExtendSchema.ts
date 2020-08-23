import { GraphQLSchema, extendSchema, parse } from 'graphql';

import { IFieldResolver, IResolvers, Request, FieldNodeMappers, ExecutionResult } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { Transform, defaultMergedResolver, DelegationContext } from '@graphql-tools/delegate';

import { ObjectValueTransformerMap, ErrorsTransformer } from '../types';

import MapFields from './MapFields';

export default class ExtendSchema implements Transform {
  private readonly typeDefs: string | undefined;
  private readonly resolvers: IResolvers | undefined;
  private readonly defaultFieldResolver: IFieldResolver<any, any> | undefined;
  private readonly transformer: MapFields;

  constructor({
    typeDefs,
    resolvers = {},
    defaultFieldResolver,
    fieldNodeTransformerMap,
    objectValueTransformerMap,
    errorsTransformer,
  }: {
    typeDefs?: string;
    resolvers?: IResolvers;
    defaultFieldResolver?: IFieldResolver<any, any>;
    fieldNodeTransformerMap?: FieldNodeMappers;
    objectValueTransformerMap?: ObjectValueTransformerMap;
    errorsTransformer?: ErrorsTransformer;
  }) {
    this.typeDefs = typeDefs;
    this.resolvers = resolvers;
    this.defaultFieldResolver = defaultFieldResolver != null ? defaultFieldResolver : defaultMergedResolver;
    this.transformer = new MapFields(
      fieldNodeTransformerMap != null ? fieldNodeTransformerMap : {},
      objectValueTransformerMap,
      errorsTransformer
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    // MapFields's transformSchema function does not actually modify the schema --
    // it saves the current schema state, to be used later to transform requests.
    this.transformer.transformSchema(schema);

    return addResolversToSchema({
      schema: this.typeDefs ? extendSchema(schema, parse(this.typeDefs)) : schema,
      resolvers: this.resolvers != null ? this.resolvers : {},
      defaultFieldResolver: this.defaultFieldResolver,
    });
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}
