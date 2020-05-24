import { GraphQLSchema } from 'graphql';
import { Transform, Request, FieldNodeTransformer, RootFieldTransformer } from '../../Interfaces';
export default class TransformRootFields implements Transform {
    private readonly transformer;
    constructor(rootFieldTransformer: RootFieldTransformer, fieldNodeTransformer?: FieldNodeTransformer);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
