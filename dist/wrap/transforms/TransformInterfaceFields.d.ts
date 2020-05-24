import { GraphQLSchema } from 'graphql';
import { Transform, Request, FieldTransformer, FieldNodeTransformer } from '../../Interfaces';
export default class TransformInterfaceFields implements Transform {
    private readonly interfaceFieldTransformer;
    private readonly fieldNodeTransformer;
    private transformer;
    constructor(interfaceFieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
