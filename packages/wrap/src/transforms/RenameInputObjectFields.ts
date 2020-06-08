import { GraphQLSchema, GraphQLInputFieldConfig, ObjectFieldNode } from 'graphql';

import { Transform, Request, mapSchema, MapperKind } from '@graphql-tools/utils';

import TransformInputObjectFields from './TransformInputObjectFields';
import { DelegationContext } from '@graphql-tools/delegate';

export default class RenameInputObjectFields implements Transform {
  private readonly renamer: (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) => string;
  private readonly transformer: TransformInputObjectFields;
  private reverseMap: Record<string, Record<string, string>>;

  constructor(renamer: (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) => string) {
    this.renamer = renamer;
    this.transformer = new TransformInputObjectFields(
      (typeName: string, inputFieldName: string, inputFieldConfig: GraphQLInputFieldConfig) => {
        const newName = renamer(typeName, inputFieldName, inputFieldConfig);
        if (newName !== undefined && newName !== inputFieldName) {
          return [renamer(typeName, inputFieldName, inputFieldConfig), inputFieldConfig];
        }
      },
      (typeName: string, inputFieldName: string, inputFieldNode: ObjectFieldNode) => {
        if (!(typeName in this.reverseMap)) {
          return inputFieldNode;
        }

        const inputFieldNameMap = this.reverseMap[typeName];
        if (!(inputFieldName in inputFieldNameMap)) {
          return inputFieldNode;
        }

        return {
          ...inputFieldNode,
          name: {
            ...inputFieldNode.name,
            value: inputFieldNameMap[inputFieldName],
          },
        };
      }
    );
    this.reverseMap = Object.create(null);
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    mapSchema(originalSchema, {
      [MapperKind.INPUT_OBJECT_FIELD]: (
        inputFieldConfig: GraphQLInputFieldConfig,
        fieldName: string,
        typeName
      ): undefined => {
        const newName = this.renamer(typeName, fieldName, inputFieldConfig);
        if (newName !== undefined && newName !== fieldName) {
          if (this.reverseMap[typeName] == null) {
            this.reverseMap[typeName] = Object.create(null);
          }
          this.reverseMap[typeName][newName] = fieldName;
        }
        return undefined;
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });

    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request, delegationContext?: DelegationContext): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext);
  }
}
