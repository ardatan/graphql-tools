import { GraphQLList, GraphQLSchema, GraphQLError } from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../../Interfaces';
export declare function handleList(type: GraphQLList<any>, list: Array<any>, errors: ReadonlyArray<GraphQLError>, subschema: GraphQLSchema | SubschemaConfig, context: Record<string, any>, info: IGraphQLToolsResolveInfo, skipTypeMerging?: boolean): any[];
