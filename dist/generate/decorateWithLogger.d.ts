import { GraphQLFieldResolver } from 'graphql';
import { ILogger } from '../Interfaces';
declare function decorateWithLogger(fn: GraphQLFieldResolver<any, any>, logger: ILogger, hint: string): GraphQLFieldResolver<any, any>;
export default decorateWithLogger;
