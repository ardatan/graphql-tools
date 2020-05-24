import { GraphQLSchema } from 'graphql';
import { Transform, Request } from '../../Interfaces';
export default class WrapFields implements Transform {
    private readonly outerTypeName;
    private readonly wrappingFieldNames;
    private readonly wrappingTypeNames;
    private readonly numWraps;
    private readonly fieldNames;
    private readonly transformer;
    constructor(outerTypeName: string, wrappingFieldNames: Array<string>, wrappingTypeNames: Array<string>, fieldNames?: Array<string>);
    transformSchema(schema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
