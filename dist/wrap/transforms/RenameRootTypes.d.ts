import { GraphQLSchema } from 'graphql';
import { Request, ExecutionResult, Transform } from '../../Interfaces';
export default class RenameRootTypes implements Transform {
    private readonly renamer;
    private map;
    private reverseMap;
    constructor(renamer: (name: string) => string | undefined);
    transformSchema(originalSchema: GraphQLSchema): GraphQLSchema;
    transformRequest(originalRequest: Request): Request;
    transformResult(result: ExecutionResult): ExecutionResult;
    private transformData;
    private transformObject;
}
