import { GraphQLSchema, GraphQLList, GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';
import { IMocks, IMockServer, IMockOptions, IMockTypeFn, ITypeDefinitions } from './Interfaces';
declare function mockServer(schema: GraphQLSchema | ITypeDefinitions, mocks: IMocks, preserveResolvers?: boolean): IMockServer;
declare function addMockFunctionsToSchema({schema, mocks, preserveResolvers}: IMockOptions): void;
declare class MockList {
    private len;
    private wrappedFunction;
    constructor(len: number | number[], wrappedFunction?: GraphQLFieldResolver<any, any>);
    mock(root: any, args: {
        [key: string]: any;
    }, context: any, info: GraphQLResolveInfo, fieldType: GraphQLList<any>, mockTypeFunc: IMockTypeFn): any[];
    private randint(low, high);
}
export { addMockFunctionsToSchema, MockList, mockServer };
