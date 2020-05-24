import { GraphQLSchema } from 'graphql';
import { IResolvers } from '../Interfaces';
declare function extendResolversFromInterfaces(schema: GraphQLSchema, resolvers: IResolvers): IResolvers<any, any>;
export default extendResolversFromInterfaces;
