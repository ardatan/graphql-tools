import { DocumentNode, GraphQLNamedType, GraphQLSchema } from 'graphql';
import { OnTypeConflict, IResolversParameter, SchemaLikeObject, SubschemaConfig } from '../Interfaces';
import { SchemaDirectiveVisitor } from '../utils/index';
declare type MergeTypeCandidate = {
    type: GraphQLNamedType;
    schema?: GraphQLSchema;
    subschema?: GraphQLSchema | SubschemaConfig;
    transformedSubschema?: GraphQLSchema;
};
export default function mergeSchemas({ subschemas, types, typeDefs, schemas: schemaLikeObjects, onTypeConflict, resolvers, schemaDirectives, inheritResolversFromInterfaces, mergeTypes, mergeDirectives, queryTypeName, mutationTypeName, subscriptionTypeName, }: {
    subschemas?: Array<GraphQLSchema | SubschemaConfig>;
    types?: Array<GraphQLNamedType>;
    typeDefs?: string | DocumentNode;
    schemas?: Array<SchemaLikeObject>;
    onTypeConflict?: OnTypeConflict;
    resolvers?: IResolversParameter;
    schemaDirectives?: {
        [name: string]: typeof SchemaDirectiveVisitor;
    };
    inheritResolversFromInterfaces?: boolean;
    mergeTypes?: boolean | Array<string> | ((typeName: string, mergeTypeCandidates: Array<MergeTypeCandidate>) => boolean);
    mergeDirectives?: boolean;
    queryTypeName?: string;
    mutationTypeName?: string;
    subscriptionTypeName?: string;
}): GraphQLSchema;
export {};
