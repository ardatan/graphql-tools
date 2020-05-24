import { ApolloLink } from 'apollo-link';
import { GraphQLFieldResolver, GraphQLSchema, BuildSchemaOptions } from 'graphql';
import { Fetcher } from '../Interfaces';
export default function makeRemoteExecutableSchema({ schema: schemaOrTypeDefs, link, fetcher, createResolver, createSubscriptionResolver, buildSchemaOptions, }: {
    schema: GraphQLSchema | string;
    link?: ApolloLink;
    fetcher?: Fetcher;
    createResolver?: (fetcher: Fetcher) => GraphQLFieldResolver<any, any>;
    createSubscriptionResolver?: (link: ApolloLink) => GraphQLFieldResolver<any, any>;
    buildSchemaOptions?: BuildSchemaOptions;
}): GraphQLSchema;
export declare function defaultCreateRemoteResolver(fetcher: Fetcher): GraphQLFieldResolver<any, any>;
export declare function defaultCreateRemoteSubscriptionResolver(link: ApolloLink): GraphQLFieldResolver<any, any>;
