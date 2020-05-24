import { GraphQLSchema } from 'graphql';
import { Transform, Request, ReplacementSelectionSetMapping } from '../../Interfaces';
export default class AddReplacementSelectionSets implements Transform {
    private readonly schema;
    private readonly mapping;
    constructor(schema: GraphQLSchema, mapping: ReplacementSelectionSetMapping);
    transformRequest(originalRequest: Request): Request;
}
