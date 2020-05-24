import { GraphQLSchema } from 'graphql';
import { Transform, Request, ReplacementFragmentMapping } from '../../Interfaces';
export default class AddReplacementFragments implements Transform {
    private readonly targetSchema;
    private readonly mapping;
    constructor(targetSchema: GraphQLSchema, mapping: ReplacementFragmentMapping);
    transformRequest(originalRequest: Request): Request;
}
