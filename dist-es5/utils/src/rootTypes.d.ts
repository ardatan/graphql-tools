import { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
export declare function getDefinedRootType(schema: GraphQLSchema, operation: OperationTypeNode): GraphQLObjectType;
export declare const getRootTypeNames: (schema: GraphQLSchema) => Set<string>;
export declare const getRootTypes: (schema: GraphQLSchema) => Set<GraphQLObjectType>;
export declare const getRootTypeMap: (schema: GraphQLSchema) => Map<OperationTypeNode, GraphQLObjectType>;
