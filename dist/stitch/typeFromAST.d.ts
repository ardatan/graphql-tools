import { DefinitionNode, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLNamedType, GraphQLObjectType, GraphQLDirective } from 'graphql';
export declare type GetType = (name: string, type: 'object' | 'interface' | 'input') => GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType;
export default function typeFromAST(node: DefinitionNode): GraphQLNamedType | GraphQLDirective | null;
/**
 * @internal
 */
export declare function getBlockStringIndentation(lines: ReadonlyArray<string>): number;
