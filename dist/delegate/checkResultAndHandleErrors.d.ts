import { GraphQLResolveInfo, ExecutionResult, GraphQLError, GraphQLOutputType, GraphQLSchema } from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';
export declare function checkResultAndHandleErrors(result: ExecutionResult, context: Record<string, any>, info: GraphQLResolveInfo, responseKey?: string, subschema?: GraphQLSchema | SubschemaConfig, returnType?: GraphQLOutputType, skipTypeMerging?: boolean): any;
export declare function handleResult(result: any, errors: ReadonlyArray<GraphQLError>, subschema: GraphQLSchema | SubschemaConfig, context: Record<string, any>, info: IGraphQLToolsResolveInfo, returnType?: GraphQLOutputType, skipTypeMerging?: boolean): any;
