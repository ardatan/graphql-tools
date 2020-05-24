import { GraphQLSchema } from 'graphql';
import { Transform, IFieldResolver, IResolvers, Request, FieldNodeMappers } from '../../Interfaces';
export default class ExtendSchema implements Transform {
    private readonly typeDefs;
    private readonly resolvers;
    private readonly defaultFieldResolver;
    private readonly transformer;
    constructor({ typeDefs, resolvers, defaultFieldResolver, fieldNodeTransformerMap, }: {
        typeDefs?: string;
        resolvers?: IResolvers;
        defaultFieldResolver?: IFieldResolver<any, any>;
        fieldNodeTransformerMap?: FieldNodeMappers;
    });
    transformSchema(schema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
