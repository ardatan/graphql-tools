import { GraphQLSchema, GraphQLOutputType } from 'graphql';
import { Transform, SubschemaConfig, IGraphQLToolsResolveInfo } from '../../Interfaces';
export default class CheckResultAndHandleErrors implements Transform {
    private readonly context?;
    private readonly info;
    private readonly fieldName?;
    private readonly subschema?;
    private readonly returnType?;
    private readonly typeMerge?;
    constructor(info: IGraphQLToolsResolveInfo, fieldName?: string, subschema?: GraphQLSchema | SubschemaConfig, context?: Record<string, any>, returnType?: GraphQLOutputType, typeMerge?: boolean);
    transformResult(result: any): any;
}
