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

import { getArgumentValues } from './getArgumentValues.js';

export interface DirectiveAnnotation {
  name: string;
  args?: Record<string, any>;
}

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

export function getDirectivesInExtensions(
  node: DirectableGraphQLObject,
  pathToDirectivesInExtensions = ['directives']
): Array<DirectiveAnnotation> {
  return pathToDirectivesInExtensions.reduce(
    (acc, pathSegment) => (acc == null ? acc : acc[pathSegment]),
    node?.extensions as unknown as Array<DirectiveAnnotation>
  );
}

function _getDirectiveInExtensions(
  directivesInExtensions: Array<DirectiveAnnotation>,
  directiveName: string
): Array<Record<string, any>> | undefined {
  const directiveInExtensions = directivesInExtensions.filter(
    directiveAnnotation => directiveAnnotation.name === directiveName
  );
  if (!directiveInExtensions.length) {
    return undefined;
  }

  return directiveInExtensions.map(directive => directive.args ?? {});
}

export function getDirectiveInExtensions(
  node: DirectableGraphQLObject,
  directiveName: string,
  pathToDirectivesInExtensions = ['directives']
): Array<Record<string, any>> | undefined {
  const directivesInExtensions = pathToDirectivesInExtensions.reduce(
    (acc, pathSegment) => (acc == null ? acc : acc[pathSegment]),
    node?.extensions as
      | Record<string, Record<string, any> | Array<Record<string, any>>>
      | Array<DirectiveAnnotation>
      | undefined
  );

  if (directivesInExtensions === undefined) {
    return undefined;
  }

  if (Array.isArray(directivesInExtensions)) {
    return _getDirectiveInExtensions(directivesInExtensions, directiveName);
  }

  // Support condensed format by converting to longer format
  // The condensed format does not preserve ordering of directives when  repeatable directives are used.
  // See https://github.com/ardatan/graphql-tools/issues/2534
  const reformattedDirectivesInExtensions: Array<DirectiveAnnotation> = [];
  for (const [name, argsOrArrayOfArgs] of Object.entries(directivesInExtensions)) {
    if (Array.isArray(argsOrArrayOfArgs)) {
      for (const args of argsOrArrayOfArgs) {
        reformattedDirectivesInExtensions.push({ name, args });
      }
    } else {
      reformattedDirectivesInExtensions.push({ name, args: argsOrArrayOfArgs });
    }
  }

  return _getDirectiveInExtensions(reformattedDirectivesInExtensions, directiveName);
}

export function getDirectives(
  schema: GraphQLSchema,
  node: DirectableGraphQLObject,
  pathToDirectivesInExtensions = ['directives']
): Array<DirectiveAnnotation> {
  const directivesInExtensions = getDirectivesInExtensions(node, pathToDirectivesInExtensions);

  if (directivesInExtensions != null && directivesInExtensions.length > 0) {
    return directivesInExtensions;
  }

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

  const result: Array<DirectiveAnnotation> = [];

  for (const astNode of astNodes) {
    if (astNode.directives) {
      for (const directiveNode of astNode.directives) {
        const schemaDirective = schemaDirectiveMap[directiveNode.name.value];
        if (schemaDirective) {
          result.push({ name: directiveNode.name.value, args: getArgumentValues(schemaDirective, directiveNode) });
        }
      }
    }
  }

  return result;
}

export function getDirective(
  schema: GraphQLSchema,
  node: DirectableGraphQLObject,
  directiveName: string,
  pathToDirectivesInExtensions = ['directives']
): Array<Record<string, any>> | undefined {
  const directiveInExtensions = getDirectiveInExtensions(node, directiveName, pathToDirectivesInExtensions);

  if (directiveInExtensions != null) {
    return directiveInExtensions;
  }

  const schemaDirective = schema && schema.getDirective ? schema.getDirective(directiveName) : undefined;

  if (schemaDirective == null) {
    return undefined;
  }

  let astNodes: Array<SchemaOrTypeNode> = [];
  if (node.astNode) {
    astNodes.push(node.astNode);
  }
  if ('extensionASTNodes' in node && node.extensionASTNodes) {
    astNodes = [...astNodes, ...node.extensionASTNodes];
  }

  const result: Array<Record<string, any>> = [];

  for (const astNode of astNodes) {
    if (astNode.directives) {
      for (const directiveNode of astNode.directives) {
        if (directiveNode.name.value === directiveName) {
          result.push(getArgumentValues(schemaDirective, directiveNode));
        }
      }
    }
  }

  if (!result.length) {
    return undefined;
  }

  return result;
}
