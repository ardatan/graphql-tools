import { GraphQLNamedType, GraphQLSchema } from 'graphql';
import { MergeInfo, IResolversParameter, SubschemaConfig } from '../Interfaces';
declare type MergeTypeCandidate = {
    type: GraphQLNamedType;
    schema?: GraphQLSchema;
    subschema?: GraphQLSchema | SubschemaConfig;
    transformedSubschema?: GraphQLSchema;
};
export declare function createMergeInfo(allSchemas: Array<GraphQLSchema>, typeCandidates: {
    [name: string]: Array<MergeTypeCandidate>;
}, mergeTypes?: boolean | Array<string> | ((typeName: string, mergeTypeCandidates: Array<MergeTypeCandidate>) => boolean)): MergeInfo;
export declare function completeMergeInfo(mergeInfo: MergeInfo, resolvers: IResolversParameter): MergeInfo;
export {};
