/* tslint:disable:no-unused-expression */

import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { cloneType, healSchema, collectFields } from '../utils';
import { default as ExtendSchema } from './ExtendSchema';

export default class WrapType implements Transform {
  private outerTypeName: string;
  private innerTypeName: string;
  private fieldName: string;
  private transformer: Transform;

  constructor(
    outerTypeName: string,
    innerTypeName: string,
    fieldName: string
  ) {
    this.outerTypeName = outerTypeName;
    this.innerTypeName = innerTypeName;
    this.fieldName = fieldName;
    this.transformer = new ExtendSchema({
      resolvers: {
        [outerTypeName]: {
          [fieldName]: parent => parent ? parent : {},
        },
      },
      fieldNodeTransformerMap: {
        [outerTypeName]: {
          [fieldName]: (fieldNode, fragments) => collectFields(fieldNode.selectionSet, fragments),
        },
      }
    });
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const typeMap = schema.getTypeMap();

    // Clone the outer type before modification.
    // When healing, changing the type name of a root type changes the root type name.
    const innerType = cloneType(typeMap[this.outerTypeName]);
    innerType.name = this.innerTypeName;

    typeMap[this.innerTypeName] = innerType;

    typeMap[this.outerTypeName] = new GraphQLObjectType({
      name: this.outerTypeName,
      fields: {
        [this.fieldName]: {
          type: typeMap[this.innerTypeName] as GraphQLObjectType,
        },
      },
    });

    return this.transformer.transformSchema(healSchema(schema));
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
