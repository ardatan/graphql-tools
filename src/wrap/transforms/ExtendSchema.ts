import { GraphQLSchema, extendSchema, parse } from 'graphql';

import {
  Transform,
  IFieldResolver,
  IResolvers,
  Request,
  FieldNodeMappers,
} from '../../Interfaces';
import { addResolversToSchema } from '../../generate/index';
import { defaultMergedResolver } from '../../stitch/index';

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
  }: {
    typeDefs?: string;
    resolvers?: IResolvers;
    defaultFieldResolver?: IFieldResolver<any, any>;
    fieldNodeTransformerMap?: FieldNodeMappers;
  }) {
    this.typeDefs = typeDefs;
    this.resolvers = resolvers;
    this.defaultFieldResolver =
      defaultFieldResolver != null
        ? defaultFieldResolver
        : defaultMergedResolver;
    this.transformer = new MapFields(
      fieldNodeTransformerMap != null ? fieldNodeTransformerMap : {},
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    this.transformer.transformSchema(schema);

    return addResolversToSchema({
      schema: this.typeDefs
        ? extendSchema(schema, parse(this.typeDefs))
        : schema,
      resolvers: this.resolvers != null ? this.resolvers : {},
      defaultFieldResolver: this.defaultFieldResolver,
    });
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
