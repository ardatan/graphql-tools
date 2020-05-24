import { GraphQLField, GraphQLSchema } from 'graphql';
import { Transform, Request } from '../../Interfaces';
export default class RenameRootFields implements Transform {
    private readonly transformer;
    constructor(renamer: (operation: 'Query' | 'Mutation' | 'Subscription', name: string, field: GraphQLField<any, any>) => string);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
