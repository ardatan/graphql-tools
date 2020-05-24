import { GraphQLSchema } from 'graphql';
import { Transform, Request, FieldTransformer, FieldNodeTransformer } from '../../Interfaces';
export default class TransformObjectFields implements Transform {
    private readonly objectFieldTransformer;
    private readonly fieldNodeTransformer;
    private transformer;
    constructor(objectFieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
