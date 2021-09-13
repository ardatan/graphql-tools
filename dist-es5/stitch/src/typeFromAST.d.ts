import {
  EnumTypeDefinitionNode,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode,
  GraphQLDirective,
  DirectiveDefinitionNode,
  TypeDefinitionNode,
} from 'graphql';
export default typeFromAST;
declare function typeFromAST(node: ObjectTypeDefinitionNode): GraphQLObjectType;
declare function typeFromAST(node: InterfaceTypeDefinitionNode): GraphQLInterfaceType;
declare function typeFromAST(node: EnumTypeDefinitionNode): GraphQLEnumType;
declare function typeFromAST(node: UnionTypeDefinitionNode): GraphQLUnionType;
declare function typeFromAST(node: ScalarTypeDefinitionNode): GraphQLScalarType;
declare function typeFromAST(node: InputObjectTypeDefinitionNode): GraphQLInputObjectType;
declare function typeFromAST(node: DirectiveDefinitionNode): GraphQLDirective;
declare function typeFromAST(node: TypeDefinitionNode): GraphQLNamedType;
