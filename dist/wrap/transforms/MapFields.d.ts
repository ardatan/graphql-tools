import { GraphQLSchema } from 'graphql';
import { Transform, Request, FieldNodeMappers } from '../../Interfaces';
export default class MapFields implements Transform {
    private readonly transformer;
    constructor(fieldNodeTransformerMap: FieldNodeMappers);
    transformSchema(schema: GraphQLSchema): GraphQLSchema;
    transformRequest(request: Request): Request;
}
