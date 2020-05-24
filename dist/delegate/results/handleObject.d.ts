import { GraphQLCompositeType, GraphQLError, GraphQLSchema } from 'graphql';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../../Interfaces';
export declare function handleObject(type: GraphQLCompositeType, object: any, errors: ReadonlyArray<GraphQLError>, subschema: GraphQLSchema | SubschemaConfig, context: Record<string, any>, info: IGraphQLToolsResolveInfo, skipTypeMerging?: boolean): any;
