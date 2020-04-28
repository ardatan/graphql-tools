import { GraphQLSchema, GraphQLFieldConfigArgumentMap } from 'graphql';

import { Transform, Request, FieldNodeMappers } from '@graphql-tools/utils';

import TransformObjectFields from './TransformObjectFields';

export default class MapFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(fieldNodeTransformerMap: FieldNodeMappers) {
    this.transformer = new TransformObjectFields(
      (_typeName, _fieldName, field) => ({
        description: field.deprecationReason,
        type: field.type,
        args: field.args.reduce<GraphQLFieldConfigArgumentMap>(
          (prev, curr) => ({
            ...prev,
            [curr.name]: curr,
          }),
          {}
        ),
        resolve: field.resolve,
        subscribe: field.subscribe,
        deprecationReason: field.deprecationReason,
        extensions: field.extensions,
        astNode: field.astNode,
      }),
      (typeName, fieldName, fieldNode, fragments) => {
        const typeTransformers = fieldNodeTransformerMap[typeName];
        if (typeTransformers == null) {
          return fieldNode;
        }

        const fieldNodeTransformer = typeTransformers[fieldName];
        if (fieldNodeTransformer == null) {
          return fieldNode;
        }

        return fieldNodeTransformer(fieldNode, fragments);
      }
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(request: Request): Request {
    return this.transformer.transformRequest(request);
  }
}
