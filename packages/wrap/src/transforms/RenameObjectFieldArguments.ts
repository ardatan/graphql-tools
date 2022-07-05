import { GraphQLSchema, GraphQLFieldConfig, FieldNode } from 'graphql';

import { ExecutionRequest, mapSchema, MapperKind } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import TransformObjectFields from './TransformObjectFields.js';

type RenamerFunction = (typeName: string, fieldName: string, argName: string) => string;

interface RenameObjectFieldArgumentsTransformationContext extends Record<string, any> {}

export default class RenameObjectFieldArguments<TContext = Record<string, any>>
  implements Transform<RenameObjectFieldArgumentsTransformationContext, TContext>
{
  private readonly renamer: RenamerFunction;
  private readonly transformer: TransformObjectFields<TContext>;
  private reverseMap: Record<string, Record<string, Record<string, string>>>;

  constructor(renamer: RenamerFunction) {
    this.renamer = renamer;
    this.transformer = new TransformObjectFields(
      (typeName, fieldName, fieldConfig) => {
        const argsConfig = Object.fromEntries(
          Object.entries(fieldConfig.args || []).map(([argName, conf]) => {
            const newName = renamer(typeName, fieldName, argName);
            if (newName !== undefined && newName !== argName) {
              if (newName != null) {
                return [newName, conf];
              }
            }
            return [argName, conf];
          })
        );
        return [fieldName, { ...fieldConfig, args: argsConfig }];
      },
      (typeName: string, fieldName: string, inputFieldNode: FieldNode) => {
        if (!(typeName in this.reverseMap)) {
          return inputFieldNode;
        }

        if (!(fieldName in this.reverseMap[typeName])) {
          return inputFieldNode;
        }

        const fieldNameMap = this.reverseMap[typeName][fieldName];

        return {
          ...inputFieldNode,
          arguments: (inputFieldNode.arguments || []).map(argNode => {
            return argNode.name.value in fieldNameMap
              ? {
                  ...argNode,
                  name: {
                    ...argNode.name,
                    value: fieldNameMap[argNode.name.value],
                  },
                }
              : argNode;
          }),
        };
      }
    );
    this.reverseMap = Object.create(null);
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    mapSchema(originalWrappingSchema, {
      [MapperKind.OBJECT_FIELD]: (
        fieldConfig: GraphQLFieldConfig<any, any>,
        fieldName: string,
        typeName
      ): undefined => {
        Object.entries(fieldConfig.args || {}).forEach(([argName]) => {
          const newName = this.renamer(typeName, fieldName, argName);
          if (newName !== undefined && newName !== fieldName) {
            if (this.reverseMap[typeName] == null) {
              this.reverseMap[typeName] = Object.create(null);
            }
            if (this.reverseMap[typeName][fieldName] == null) {
              this.reverseMap[typeName][fieldName] = Object.create(null);
            }
            this.reverseMap[typeName][fieldName][newName] = argName;
          }
        });
        return undefined;
      },

      [MapperKind.ROOT_OBJECT]() {
        return undefined;
      },
    });

    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: RenameObjectFieldArgumentsTransformationContext
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}
