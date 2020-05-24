import { GraphQLField, GraphQLSchema } from 'graphql';
import { Transform, Request } from '../../Interfaces';
export default class RenameInterfaceFields implements Transform {
    private readonly transformer;
    constructor(renamer: (typeName: string, fieldName: string, field: GraphQLField<any, any>) => string);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
}
