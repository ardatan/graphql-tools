import { GraphQLSchema } from 'graphql';
import { Transform, Request } from '../../Interfaces';
export default class AddTypenameToAbstract implements Transform {
    private readonly targetSchema;
    constructor(targetSchema: GraphQLSchema);
    transformRequest(originalRequest: Request): Request;
}
