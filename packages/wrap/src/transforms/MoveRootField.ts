import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema, Kind, OperationTypeNode, visit } from 'graphql';
import {
  ExecutionRequest,
  ExecutionResult,
  MapperKind,
  getDefinedRootType,
  getRootTypeMap,
  mapSchema,
} from '@graphql-tools/utils';
import { DelegationContext, Transform } from '@graphql-tools/delegate';

const defaultRootTypeNames = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

export class MoveRootField implements Transform {
  private to: Record<OperationTypeNode, Record<string, OperationTypeNode>> = {
    query: {},
    mutation: {},
    subscription: {},
  };

  constructor(private from: Record<OperationTypeNode, Record<string, OperationTypeNode>>) {
    for (const operation in this.from) {
      const removedFields = this.from[operation as OperationTypeNode];
      for (const fieldName in removedFields) {
        const newOperation = removedFields[fieldName];
        this.to[newOperation][fieldName] = operation as OperationTypeNode;
      }
    }
  }

  public transformSchema(schema: GraphQLSchema, _subschemaConfig: Record<string, any>): GraphQLSchema {
    const rootTypeMap = getRootTypeMap(schema);
    const newRootFieldsMap: Record<OperationTypeNode, GraphQLFieldConfigMap<any, any>> = {
      query: rootTypeMap.get('query' as OperationTypeNode)?.toConfig()?.fields || {},
      mutation: rootTypeMap.get('mutation' as OperationTypeNode)?.toConfig()?.fields || {},
      subscription: rootTypeMap.get('subscription' as OperationTypeNode)?.toConfig()?.fields || {},
    };
    for (const operation in this.from) {
      const removedFields = this.from[operation as OperationTypeNode];
      for (const fieldName in removedFields) {
        const fieldConfig = newRootFieldsMap[operation as OperationTypeNode][fieldName];
        delete newRootFieldsMap[operation]?.[fieldName];
        const newOperation = removedFields[fieldName];
        newRootFieldsMap[newOperation][fieldName] = fieldConfig;
      }
    }
    const schemaConfig = schema.toConfig();
    for (const rootType in newRootFieldsMap) {
      const newRootFields = newRootFieldsMap[rootType as OperationTypeNode];
      if (!schemaConfig[rootType] && Object.keys(newRootFields).length > 0) {
        schemaConfig[rootType] = new GraphQLObjectType({
          name: defaultRootTypeNames[rootType],
          fields: newRootFields,
        });
      }
    }
    return mapSchema(new GraphQLSchema(schemaConfig), {
      [MapperKind.QUERY]: type => {
        const queryConfig = type.toConfig();
        queryConfig.fields = newRootFieldsMap.query;
        return new GraphQLObjectType(queryConfig);
      },
      [MapperKind.MUTATION]: type => {
        const mutationConfig = type.toConfig();
        mutationConfig.fields = newRootFieldsMap.mutation;
        return new GraphQLObjectType(mutationConfig);
      },
      [MapperKind.SUBSCRIPTION]: type => {
        const subscriptionConfig = type.toConfig();
        subscriptionConfig.fields = newRootFieldsMap.subscription;
        return new GraphQLObjectType(subscriptionConfig);
      },
    });
  }

  public transformRequest(originalRequest: ExecutionRequest, delegationContext: DelegationContext): ExecutionRequest {
    const newOperation = this.to[delegationContext.operation][delegationContext.fieldName];
    if (newOperation && newOperation !== delegationContext.operation) {
      return {
        ...originalRequest,
        document: visit(originalRequest.document, {
          [Kind.OPERATION_DEFINITION]: node => {
            return {
              ...node,
              operation: newOperation,
            };
          },
        }),
      };
    }
    return originalRequest;
  }

  public transformResult(result: ExecutionResult, delegationContext: DelegationContext) {
    if (result.data?.__typename) {
      const newOperation = this.to[delegationContext.operation][delegationContext.fieldName];
      if (newOperation && newOperation !== delegationContext.operation) {
        result.data.__typename = getDefinedRootType(delegationContext.targetSchema, newOperation)?.name;
      }
    }
    return result;
  }
}
