import {
  GraphQLDirective,
  GraphQLSchema,
  SchemaDefinitionNode,
  TypeDefinitionNode,
  SchemaExtensionNode,
  TypeExtensionNode,
  GraphQLNamedType,
  GraphQLField,
  GraphQLInputField,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  GraphQLFieldConfig,
  GraphQLInputFieldConfig,
  GraphQLSchemaConfig,
  GraphQLObjectTypeConfig,
  GraphQLInterfaceTypeConfig,
  GraphQLUnionTypeConfig,
  GraphQLScalarTypeConfig,
  GraphQLEnumTypeConfig,
  GraphQLInputObjectTypeConfig,
  GraphQLEnumValue,
  GraphQLEnumValueConfig,
  EnumValueDefinitionNode,
} from 'graphql';

import { getArgumentValues } from './getArgumentValues';

export type DirectiveUseMap = { [key: string]: any };

type SchemaOrTypeNode =
  | SchemaDefinitionNode
  | SchemaExtensionNode
  | TypeDefinitionNode
  | TypeExtensionNode
  | EnumValueDefinitionNode
  | FieldDefinitionNode
  | InputValueDefinitionNode;

type DirectableGraphQLObject =
  | GraphQLSchema
  | GraphQLSchemaConfig
  | GraphQLNamedType
  | GraphQLObjectTypeConfig<any, any>
  | GraphQLInterfaceTypeConfig<any, any>
  | GraphQLUnionTypeConfig<any, any>
  | GraphQLScalarTypeConfig<any, any>
  | GraphQLEnumTypeConfig
  | GraphQLEnumValue
  | GraphQLEnumValueConfig
  | GraphQLInputObjectTypeConfig
  | GraphQLField<any, any>
  | GraphQLInputField
  | GraphQLFieldConfig<any, any>
  | GraphQLInputFieldConfig;

export function getDirectives(schema: GraphQLSchema, node: DirectableGraphQLObject): DirectiveUseMap {
  const schemaDirectives: ReadonlyArray<GraphQLDirective> =
    schema && schema.getDirectives ? schema.getDirectives() : [];

  const schemaDirectiveMap = schemaDirectives.reduce((schemaDirectiveMap, schemaDirective) => {
    schemaDirectiveMap[schemaDirective.name] = schemaDirective;
    return schemaDirectiveMap;
  }, {});

  let astNodes: Array<SchemaOrTypeNode> = [];
  if (node.astNode) {
    astNodes.push(node.astNode);
  }
  if ('extensionASTNodes' in node && node.extensionASTNodes) {
    astNodes = [...astNodes, ...node.extensionASTNodes];
  }

  const result: DirectiveUseMap = {};

  astNodes.forEach(astNode => {
    if (astNode.directives) {
      astNode.directives.forEach(directive => {
        const schemaDirective = schemaDirectiveMap[directive.name.value];
        if (schemaDirective) {
          const directiveValue = getDirectiveValues(schemaDirective, astNode);

          if (schemaDirective.isRepeatable) {
            if (result[schemaDirective.name]) {
              result[schemaDirective.name] = result[schemaDirective.name].concat([directiveValue]);
            } else {
              result[schemaDirective.name] = [directiveValue];
            }
          } else {
            result[schemaDirective.name] = directiveValue;
          }
        }
      });
    }
  });

  return result;
}

// graphql-js getDirectiveValues does not handle repeatable directives
function getDirectiveValues(directiveDef: GraphQLDirective, node: SchemaOrTypeNode): any {
  if (node.directives) {
    if (directiveDef.isRepeatable) {
      const directiveNodes = node.directives.filter(directive => directive.name.value === directiveDef.name);

      return directiveNodes.map(directiveNode => getArgumentValues(directiveDef, directiveNode));
    }

    const directiveNode = node.directives.find(directive => directive.name.value === directiveDef.name);

    return getArgumentValues(directiveDef, directiveNode);
  }
}
