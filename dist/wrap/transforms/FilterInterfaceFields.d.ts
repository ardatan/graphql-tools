import { GraphQLSchema } from 'graphql';
import { Transform, FieldFilter } from '../../Interfaces';
export default class FilterInterfaceFields implements Transform {
    private readonly transformer;
    constructor(filter: FieldFilter);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
}
