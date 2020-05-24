import { GraphQLSchema } from 'graphql';
import { IResolverValidationOptions } from '../Interfaces';
declare function assertResolversPresent(schema: GraphQLSchema, resolverValidationOptions?: IResolverValidationOptions): void;
export default assertResolversPresent;
