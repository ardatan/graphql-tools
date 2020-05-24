import { GraphQLSchema } from 'graphql';
import { Transform, RootFieldFilter } from '../../Interfaces';
export default class FilterRootFields implements Transform {
    private readonly transformer;
    constructor(filter: RootFieldFilter);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
}
