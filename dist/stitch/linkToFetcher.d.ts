import { ApolloLink } from 'apollo-link';
import { Fetcher } from '../Interfaces';
export { execute } from 'apollo-link';
export default function linkToFetcher(link: ApolloLink): Fetcher;
