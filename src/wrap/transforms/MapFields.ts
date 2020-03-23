import {
  GraphQLSchema,
  FieldNode,
  SelectionNode,
  FragmentDefinitionNode,
} from 'graphql';

import { Transform, Request } from '../../Interfaces';
import { toConfig } from '../../polyfills/index';

import TransformObjectFields from './TransformObjectFields';

export type FieldNodeTransformer = (
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
) => SelectionNode | Array<SelectionNode>;

export type FieldNodeTransformerMap = {
  [typeName: string]: {
    [fieldName: string]: FieldNodeTransformer;
  };
};

export default class MapFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(fieldNodeTransformerMap: FieldNodeTransformerMap) {
    this.transformer = new TransformObjectFields(
      (_typeName, _fieldName, field) => toConfig(field),
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
      },
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(request: Request): Request {
    return this.transformer.transformRequest(request);
  }
}
