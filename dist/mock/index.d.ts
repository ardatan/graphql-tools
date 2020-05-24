import { GraphQLSchema, GraphQLList, GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';
import { IMocks, IMockServer, IMockOptions, IMockTypeFn, ITypeDefinitions } from '../Interfaces';
/**
 * This function wraps addMocksToSchema for more convenience
 */
declare function mockServer(schema: GraphQLSchema | ITypeDefinitions, mocks: IMocks, preserveResolvers?: boolean): IMockServer;
declare function addMocksToSchema({ schema, mocks, preserveResolvers, }: IMockOptions): void;
declare class MockList {
    private readonly len;
    private readonly wrappedFunction;
    constructor(len: number | Array<number>, wrappedFunction?: GraphQLFieldResolver<any, any>);
    mock(root: any, args: {
        [key: string]: any;
    }, context: any, info: GraphQLResolveInfo, fieldType: GraphQLList<any>, mockTypeFunc: IMockTypeFn): any[];
    private randint;
}
declare function addMockFunctionsToSchema({ schema, mocks, preserveResolvers, }: IMockOptions): void;
export { addMocksToSchema, addMockFunctionsToSchema, MockList, mockServer };
