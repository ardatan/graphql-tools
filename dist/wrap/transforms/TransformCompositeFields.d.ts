import { GraphQLSchema } from 'graphql';
import { Transform, Request, FieldTransformer, FieldNodeTransformer } from '../../Interfaces';
export default class TransformCompositeFields implements Transform {
    private readonly fieldTransformer;
    private readonly fieldNodeTransformer;
    private transformedSchema;
    private mapping;
    constructor(fieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
    private transformFields;
    private transformDocument;
}
