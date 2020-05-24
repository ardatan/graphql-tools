import { GraphQLSchema } from 'graphql';
import { IDirectiveResolvers } from '../Interfaces';
declare function attachDirectiveResolvers(schema: GraphQLSchema, directiveResolvers: IDirectiveResolvers): void;
export default attachDirectiveResolvers;
