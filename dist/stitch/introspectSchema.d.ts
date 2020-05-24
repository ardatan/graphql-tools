import { ApolloLink } from 'apollo-link';
import { GraphQLSchema } from 'graphql';
import { Fetcher } from '../Interfaces';
export default function introspectSchema(linkOrFetcher: ApolloLink | Fetcher, linkContext?: {
    [key: string]: any;
}): Promise<GraphQLSchema>;
