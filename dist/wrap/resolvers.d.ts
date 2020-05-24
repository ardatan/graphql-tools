import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
import { Transform, IResolvers, SubschemaConfig } from '../Interfaces';
export declare function generateProxyingResolvers({ subschemaConfig, transforms, }: {
    subschemaConfig: SubschemaConfig;
    transforms?: Array<Transform>;
}): IResolvers;
export declare function defaultCreateProxyingResolver(schema: GraphQLSchema | SubschemaConfig, transforms: Array<Transform>): GraphQLFieldResolver<any, any>;
export declare function stripResolvers(schema: GraphQLSchema): void;
