import { GraphQLSchema } from 'graphql';
import { Transform, Request } from '../../Interfaces';
export default class HoistField implements Transform {
    private readonly typeName;
    private readonly path;
    private readonly newFieldName;
    private readonly pathToField;
    private readonly oldFieldName;
    private readonly transformer;
    constructor(typeName: string, path: Array<string>, newFieldName: string);
    transformSchema(schema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
