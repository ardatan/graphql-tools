import { GraphQLSchema } from 'graphql';
import { Transform, Request, MergedTypeInfo } from '../../Interfaces';
export default class AddMergedTypeFragments implements Transform {
    private readonly targetSchema;
    private readonly mapping;
    constructor(targetSchema: GraphQLSchema, mapping: Record<string, MergedTypeInfo>);
    transformRequest(originalRequest: Request): Request;
}
