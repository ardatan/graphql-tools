import { GraphQLError, ASTNode } from 'graphql';
export declare function relocatedError(originalError: Error | GraphQLError, nodes: ReadonlyArray<ASTNode>, path: ReadonlyArray<string | number>): GraphQLError;
export declare function slicedError(originalError: GraphQLError): GraphQLError;
export declare function getErrorsByPathSegment(errors: ReadonlyArray<GraphQLError>): Record<string, Array<GraphQLError>>;
declare class CombinedError extends Error {
    errors: ReadonlyArray<GraphQLError>;
    constructor(message: string, errors: ReadonlyArray<GraphQLError>);
}
export declare function combineErrors(errors: ReadonlyArray<GraphQLError>): GraphQLError | CombinedError;
export declare function setErrors(result: any, errors: Array<GraphQLError>): void;
export declare function getErrors(result: any, pathSegment: string): Array<GraphQLError>;
export {};
