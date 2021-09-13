import { GraphQLSchema, GraphQLObjectType, OperationTypeNode } from 'graphql';
import { ExecutionRequest } from '@graphql-tools/utils';
import { ICreateRequestFromInfo, ICreateRequest } from './types';
export declare function getDelegatingOperation(parentType: GraphQLObjectType, schema: GraphQLSchema): OperationTypeNode;
export declare function createRequestFromInfo({
  info,
  rootValue,
  operationName,
  operation,
  fieldName,
  selectionSet,
  fieldNodes,
  context,
}: ICreateRequestFromInfo): ExecutionRequest;
export declare function createRequest({
  sourceSchema,
  sourceParentType,
  sourceFieldName,
  fragments,
  variableDefinitions,
  variableValues,
  targetRootValue,
  targetOperationName,
  targetOperation,
  targetFieldName,
  selectionSet,
  fieldNodes,
  context,
  info,
}: ICreateRequest): ExecutionRequest;
