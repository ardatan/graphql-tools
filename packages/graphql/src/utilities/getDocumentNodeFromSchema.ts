// TODO: add tests for me

import { DefinitionNode, DocumentNode } from '../language/ast';
import { Kind } from '../language';
import {
  GraphQLSchema,
  isSpecifiedDirective,
  isSpecifiedScalarType,
  isIntrospectionType,
  isObjectType,
  isInterfaceType,
  isEnumType,
  isScalarType,
  isInputObjectType,
  isUnionType,
} from '../type';
import {
  astFromDirective,
  astFromEnumType,
  astFromInputObjectType,
  astFromInterfaceType,
  astFromObjectType,
  astFromScalarType,
  astFromSchema,
  astFromUnionType,
} from './astFromSchema';

export interface GetDocumentNodeFromSchemaOptions {
  pathToDirectivesInExtensions?: Array<string>;
}

export function getDocumentNodeFromSchema(
  schema: GraphQLSchema,
  options: GetDocumentNodeFromSchemaOptions = {}
): DocumentNode {
  const pathToDirectivesInExtensions = options.pathToDirectivesInExtensions;

  const typesMap = schema.getTypeMap();

  const schemaNode = astFromSchema(schema, pathToDirectivesInExtensions);
  const definitions: Array<DefinitionNode> = schemaNode != null ? [schemaNode] : [];

  const directives = schema.getDirectives();
  for (const directive of directives) {
    if (isSpecifiedDirective(directive)) {
      continue;
    }

    definitions.push(astFromDirective(directive, schema, pathToDirectivesInExtensions));
  }

  for (const typeName in typesMap) {
    const type = typesMap[typeName];
    const isPredefinedScalar = isSpecifiedScalarType(type);
    const isIntrospection = isIntrospectionType(type);

    if (isPredefinedScalar || isIntrospection) {
      continue;
    }

    if (isObjectType(type)) {
      definitions.push(astFromObjectType(type, schema, pathToDirectivesInExtensions));
    } else if (isInterfaceType(type)) {
      definitions.push(astFromInterfaceType(type, schema, pathToDirectivesInExtensions));
    } else if (isUnionType(type)) {
      definitions.push(astFromUnionType(type, schema, pathToDirectivesInExtensions));
    } else if (isInputObjectType(type)) {
      definitions.push(astFromInputObjectType(type, schema, pathToDirectivesInExtensions));
    } else if (isEnumType(type)) {
      definitions.push(astFromEnumType(type, schema, pathToDirectivesInExtensions));
    } else if (isScalarType(type)) {
      definitions.push(astFromScalarType(type, schema, pathToDirectivesInExtensions));
    } else {
      throw new Error(`Unknown type ${type}.`);
    }
  }

  return {
    kind: Kind.DOCUMENT,
    definitions,
  };
}
