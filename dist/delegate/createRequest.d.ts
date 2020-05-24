import { GraphQLSchema, GraphQLObjectType, OperationTypeNode } from 'graphql';
import { ICreateRequestFromInfo, Request, ICreateRequest } from '../Interfaces';
export declare function getDelegatingOperation(parentType: GraphQLObjectType, schema: GraphQLSchema): OperationTypeNode;
export declare function createRequestFromInfo({ info, operation, fieldName, selectionSet, fieldNodes, }: ICreateRequestFromInfo): Request;
export declare function createRequest({ sourceSchema, sourceParentType, sourceFieldName, fragments, variableDefinitions, variableValues, targetOperation, targetFieldName, selectionSet, fieldNodes, }: ICreateRequest): Request;
