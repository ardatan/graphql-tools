import {
  GraphQLSchema,
  print,
  printType,
  GraphQLNamedType,
  Kind,
  ObjectTypeExtensionNode,
  isSpecifiedScalarType,
  isIntrospectionType,
  isScalarType,
  parse,
  TypeDefinitionNode,
  DirectiveNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  EnumValueDefinitionNode,
} from 'graphql';
import { SchemaPrintOptions } from './types';
import { createSchemaDefinition } from './create-schema-definition';

export function printSchemaWithDirectives(schema: GraphQLSchema, _options: SchemaPrintOptions = {}): string {
  const typesMap = schema.getTypeMap();

  const result: string[] = [getSchemaDefinition(schema)];

  for (const typeName in typesMap) {
    const type = typesMap[typeName];
    const isPredefinedScalar = isScalarType(type) && isSpecifiedScalarType(type);
    const isIntrospection = isIntrospectionType(type);

    if (isPredefinedScalar || isIntrospection) {
      continue;
    }

    // KAMIL: we might want to turn on descriptions in future
    result.push(print(correctType(typeName, typesMap)?.astNode));
  }

  const directives = schema.getDirectives();
  for (const directive of directives) {
    if (directive.astNode) {
      result.push(print(directive.astNode));
    }
  }

  return result.join('\n');
}

function extendDefinition(type: GraphQLNamedType): GraphQLNamedType['astNode'] {
  switch (type.astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    default:
      return type.astNode;
  }
}

function correctType<TMap extends { [key: string]: GraphQLNamedType }, TName extends keyof TMap>(
  typeName: TName,
  typesMap: TMap
): TMap[TName] {
  const type = typesMap[typeName];

  type.name = typeName.toString();

  if (type.astNode && type.extensionASTNodes) {
    type.astNode = type.extensionASTNodes ? extendDefinition(type) : type.astNode;
  }
  const doc = parse(printType(type));
  const fixedAstNode = doc.definitions[0] as TypeDefinitionNode;
  const originalAstNode = type?.astNode;
  if (originalAstNode) {
    (fixedAstNode.directives as DirectiveNode[]) = originalAstNode?.directives as DirectiveNode[];
    if ('fields' in fixedAstNode && 'fields' in originalAstNode) {
      for (const fieldDefinitionNode of fixedAstNode.fields) {
        const originalFieldDefinitionNode = (originalAstNode.fields as (
          | InputValueDefinitionNode
          | FieldDefinitionNode
        )[]).find(field => field.name.value === fieldDefinitionNode.name.value);
        (fieldDefinitionNode.directives as DirectiveNode[]) = originalFieldDefinitionNode?.directives as DirectiveNode[];
        if ('arguments' in fieldDefinitionNode && 'arguments' in originalFieldDefinitionNode) {
          for (const argument of fieldDefinitionNode.arguments) {
            const originalArgumentNode = (originalFieldDefinitionNode as FieldDefinitionNode).arguments?.find(
              arg => arg.name.value === argument.name.value
            );
            (argument.directives as DirectiveNode[]) = originalArgumentNode.directives as DirectiveNode[];
          }
        }
      }
    } else if ('values' in fixedAstNode && 'values' in originalAstNode) {
      for (const valueDefinitionNode of fixedAstNode.values) {
        const originalValueDefinitionNode = (originalAstNode.values as EnumValueDefinitionNode[]).find(
          valueNode => valueNode.name.value === valueDefinitionNode.name.value
        );
        (valueDefinitionNode.directives as DirectiveNode[]) = originalValueDefinitionNode?.directives as DirectiveNode[];
      }
    }
  }
  type.astNode = fixedAstNode;

  return type;
}

function getSchemaDefinition(schema: GraphQLSchema) {
  if (!Object.getOwnPropertyDescriptor(schema, 'astNode').get && schema.astNode) {
    return print(schema.astNode);
  } else {
    return createSchemaDefinition({
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    });
  }
}
